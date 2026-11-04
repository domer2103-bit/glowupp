"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_URL } from "@/lib/notifications";
import { UserRole } from "@/generated/prisma/client";
import { PRO_LAUNCH_PRICE_PENCE, isProActive, type BillingIntervalKey } from "@/lib/plans";
import { getProfessionalSubscription } from "@/lib/data/subscriptions";

async function currentProfessional() {
  const user = await requireRole(UserRole.PROFESSIONAL);
  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) redirect("/professional/onboarding");
  return { user, professional };
}

/**
 * Starts Stripe Checkout for the Pro plan, then redirects to it. The plan only
 * turns on when the webhook confirms the subscription (src/app/api/webhooks/
 * stripe/route.ts) — landing on the success URL proves nothing.
 *
 * The recurring price is created inline at the launch price, so Stripe keeps
 * charging that amount for as long as the subscription lasts.
 */
export async function startProCheckout(formData: FormData): Promise<void> {
  const { user, professional } = await currentProfessional();
  const interval: BillingIntervalKey = formData.get("interval") === "year" ? "year" : "month";

  const existing = await getProfessionalSubscription(professional.id);
  if (isProActive(existing)) redirect("/professional/plan");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: PRO_LAUNCH_PRICE_PENCE[interval],
          recurring: { interval },
          product_data: { name: "GlowUpp Pro" },
        },
        quantity: 1,
      },
    ],
    // Reuse the Stripe customer if they have subscribed before, so invoices stay together.
    ...(existing ? { customer: existing.stripeCustomerId } : { customer_email: user.email }),
    client_reference_id: professional.id,
    metadata: { professionalId: professional.id, plan: "PRO" },
    subscription_data: { metadata: { professionalId: professional.id, plan: "PRO" } },
    success_url: `${APP_URL}/professional/plan?started=1`,
    cancel_url: `${APP_URL}/pricing?cancelled=1`,
  });
  if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
  redirect(session.url);
}

/** Stops the plan renewing (it stays active until the paid period ends), or undoes that. */
export async function setProCancellation(cancel: boolean): Promise<void> {
  const { professional } = await currentProfessional();
  const sub = await getProfessionalSubscription(professional.id);
  if (!sub || !isProActive(sub)) redirect("/professional/plan");

  const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: cancel });
  await prisma.professionalSubscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: updated.cancel_at_period_end } });
  redirect(`/professional/plan?${cancel ? "cancelling=1" : "resumed=1"}`);
}

/** Stripe's hosted page for changing the card and downloading invoices. */
export async function openBillingPortal(): Promise<void> {
  const { professional } = await currentProfessional();
  const sub = await getProfessionalSubscription(professional.id);
  if (!sub) redirect("/pricing");

  let url: string;
  try {
    const portal = await stripe.billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: `${APP_URL}/professional/plan` });
    url = portal.url;
  } catch (err) {
    console.error("[billing portal] could not open", err);
    redirect("/professional/plan?portal_error=1");
  }
  redirect(url);
}
