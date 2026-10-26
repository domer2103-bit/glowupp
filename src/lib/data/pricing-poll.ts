import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";
import { PRICING_POLL_ACTIVITY, tallyVotes, type PricingTally, type PricingVote } from "@/lib/pricing-poll";

/** One anonymous vote. `label` is where the visitor first came from (utm tags / referrer), so a Facebook-group vote can be told apart from a LinkedIn one. */
export async function recordPricingVote(vote: PricingVote, label: string): Promise<void> {
  await prisma.activityLog.create({
    data: { type: PRICING_POLL_ACTIVITY, metadata: { ...vote, label } },
  });
}

async function loadVotes() {
  const rows = await prisma.activityLog.findMany({ where: { type: PRICING_POLL_ACTIVITY }, select: { metadata: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => {
    const m = (r.metadata ?? {}) as { choice?: string; price?: string; trade?: string; label?: string };
    return { choice: m.choice ?? "", price: m.price ?? null, trade: m.trade ?? null, label: m.label ?? "direct", createdAt: r.createdAt };
  });
}

/** Overall result, safe to show on the thank-you screen (no admin check: only counts, no individual rows). */
export async function getPublicPollTally(): Promise<PricingTally> {
  return tallyVotes(await loadVotes());
}

/** Admin results: totals plus a breakdown by the source each voter first came from. */
export async function getAdminPollResults() {
  await requireRole(UserRole.ADMIN);
  const votes = await loadVotes();
  const bySource: Record<string, PricingTally> = {};
  for (const label of new Set(votes.map((v) => v.label))) bySource[label] = tallyVotes(votes.filter((v) => v.label === label));
  return { tally: tallyVotes(votes), bySource, latest: votes[0]?.createdAt ?? null };
}
