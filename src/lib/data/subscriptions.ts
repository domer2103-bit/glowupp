import "server-only";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { intervalFromStripe, isProActive, mapStripeStatus } from "@/lib/plans";

export async function getProfessionalSubscription(professionalId: string) {
  return prisma.professionalSubscription.findUnique({ where: { professionalId } });
}

/** Whether this professional currently has the paid Pro plan (see isProActive for what counts). */
export async function hasActivePro(professionalId: string): Promise<boolean> {
  return isProActive(await getProfessionalSubscription(professionalId));
}

/**
 * Which of these professionals have an active Pro plan — one query, for lists
 * (the homeowner's quote comparison) so a badge costs no extra round trips.
 */
export async function activeProIds(professionalIds: string[]): Promise<Set<string>> {
  if (professionalIds.length === 0) return new Set();
  const rows = await prisma.professionalSubscription.findMany({
    where: { professionalId: { in: professionalIds }, status: { in: ["ACTIVE", "PAST_DUE"] } },
    select: { professionalId: true },
  });
  return new Set(rows.map((r) => r.professionalId));
}

function customerId(sub: Stripe.Subscription): string {
  return typeof sub.customer === "string" ? sub.customer : sub.customer.id;
}

/**
 * Writes the Stripe subscription's current state to our table. Safe to run
 * any number of times with the same data (Stripe redelivers events), and safe
 * out of order because it always stores the state carried by the event it is
 * given. The professional is found from the metadata set at checkout, or from
 * the row that already holds this Stripe subscription id.
 */
export async function syncSubscriptionFromStripe(sub: Stripe.Subscription): Promise<{ professionalId: string } | null> {
  const item = sub.items.data[0];
  const existing = await prisma.professionalSubscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
  const professionalId = sub.metadata?.professionalId || existing?.professionalId;
  if (!professionalId || !item) return null;

  const periodEnd = item.current_period_end ? new Date(item.current_period_end * 1000) : null;
  const data = {
    stripeCustomerId: customerId(sub),
    stripeSubscriptionId: sub.id,
    status: mapStripeStatus(sub.status),
    interval: intervalFromStripe(item.price.recurring?.interval),
    unitAmountPence: item.price.unit_amount ?? 0,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
  await prisma.professionalSubscription.upsert({ where: { professionalId }, create: { professionalId, ...data }, update: data });
  return { professionalId };
}
