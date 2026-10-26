"use server";

import { cookies } from "next/headers";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ATTRIBUTION_COOKIE } from "@/lib/attribution-cookie";
import { attributionLabel, decodeAttribution } from "@/lib/attribution";
import { getPublicPollTally, recordPricingVote } from "@/lib/data/pricing-poll";
import {
  MIN_VOTES_TO_SHOW_RESULTS,
  PRICING_POLL_COOKIE,
  PRICING_POLL_COOKIE_MAX_AGE_SECONDS,
  PricingVoteSchema,
  percent,
} from "@/lib/pricing-poll";

export type PollState =
  | { error?: string; success?: boolean; results?: { total: number; commissionPct: number; subscriptionPct: number } | null }
  | undefined;

/** Public, unauthenticated, anonymous: stores one vote (activity_log) and remembers the browser so a second tap does not double count. */
export async function submitPricingPoll(_prev: PollState, formData: FormData): Promise<PollState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`pricing-poll:${ip}`, 10, 60 * 60 * 1000)) return { error: "Too many votes from this location. Please try again later." };

  const parsed = PricingVoteSchema.safeParse({
    choice: formData.get("choice"),
    price: formData.get("price") || undefined,
    trade: formData.get("trade") || undefined,
  });
  if (!parsed.success) return { error: "Pick one of the two options first." };

  const jar = await cookies();
  if (!jar.get(PRICING_POLL_COOKIE)) {
    const label = attributionLabel(decodeAttribution(jar.get(ATTRIBUTION_COOKIE)?.value));
    await recordPricingVote(parsed.data, label);
    jar.set(PRICING_POLL_COOKIE, "1", { httpOnly: true, sameSite: "lax", maxAge: PRICING_POLL_COOKIE_MAX_AGE_SECONDS, path: "/" });
  }

  const tally = await getPublicPollTally();
  const results =
    tally.total >= MIN_VOTES_TO_SHOW_RESULTS
      ? { total: tally.total, commissionPct: percent(tally.commission, tally.total), subscriptionPct: percent(tally.subscription, tally.total) }
      : null;
  return { success: true, results };
}
