import { z } from "zod";

/**
 * "Which would you pick?" poll for tradespeople (/poll): pay-as-you-win commission vs. a flat monthly fee.
 * A flat monthly plan does NOT exist yet — this only measures demand and price tolerance, so the page and every
 * post must say so. Votes are stored as activity_log rows (no migration); this file is pure so it can be tested.
 */
export const PRICING_POLL_ACTIVITY = "PRICING_POLL";
/** Remembers that this browser has voted (one vote per browser, a soft limit for an informal poll). */
export const PRICING_POLL_COOKIE = "glowupp_poll";
export const PRICING_POLL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
/** Live percentages are only shown once there are enough votes for them to mean something. */
export const MIN_VOTES_TO_SHOW_RESULTS = 20;

export const POLL_CHOICES = ["commission", "subscription"] as const;
export type PollChoice = (typeof POLL_CHOICES)[number];

export const POLL_PRICE_OPTIONS = [
  { value: "19", label: "£19 a month" },
  { value: "29", label: "£29 a month" },
  { value: "49", label: "£49 a month" },
  { value: "79", label: "£79 a month" },
  { value: "none", label: "None — I'd rather pay 2% only when I win" },
] as const;

export const POLL_TRADES = [
  "Builder",
  "Kitchen or bathroom fitter",
  "Plumber or heating engineer",
  "Electrician",
  "Decorator",
  "Landscaper or groundworker",
  "Joiner or carpenter",
  "Tiler or flooring fitter",
  "Other trade",
] as const;

const PRICE_VALUES = POLL_PRICE_OPTIONS.map((o) => o.value) as [string, ...string[]];

/** `price` and `trade` are optional follow-ups: a vote with just a choice still counts. */
export const PricingVoteSchema = z.object({
  choice: z.enum(POLL_CHOICES),
  price: z.enum(PRICE_VALUES).optional(),
  trade: z.enum(POLL_TRADES).optional(),
});
export type PricingVote = z.infer<typeof PricingVoteSchema>;

export type PricingTally = {
  total: number;
  commission: number;
  subscription: number;
  /** Price answers among everyone who answered that question, keyed by option value. */
  byPrice: Record<string, number>;
  byTrade: Record<string, number>;
};

export function tallyVotes(votes: Array<{ choice: string; price?: string | null; trade?: string | null }>): PricingTally {
  const tally: PricingTally = { total: 0, commission: 0, subscription: 0, byPrice: {}, byTrade: {} };
  for (const v of votes) {
    if (v.choice === "commission") tally.commission += 1;
    else if (v.choice === "subscription") tally.subscription += 1;
    else continue;
    tally.total += 1;
    if (v.price) tally.byPrice[v.price] = (tally.byPrice[v.price] ?? 0) + 1;
    if (v.trade) tally.byTrade[v.trade] = (tally.byTrade[v.trade] ?? 0) + 1;
  }
  return tally;
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
