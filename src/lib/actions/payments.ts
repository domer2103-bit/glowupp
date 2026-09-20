"use server";

import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { APP_URL } from "@/lib/notifications";
import { TransactionStatus } from "@/generated/prisma/client";

/**
 * Professional action: starts a Stripe Checkout session for a lead fee
 * they owe, then redirects to it. The Transaction only ever moves to
 * PAID via the webhook (src/app/api/webhooks/stripe/route.ts) — this
 * action just gets them to Stripe's hosted payment page.
 */
export async function createLeadFeeCheckoutSession(transactionId: string): Promise<void> {
  const user = await requireUser();

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { professional: true, project: true },
  });
  if (!transaction || transaction.professional.userId !== user.id) notFound();

  if (transaction.status !== TransactionStatus.PENDING) {
    redirect("/professional/transactions");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: transaction.feeAmount,
          product_data: {
            name: `GlowUpp lead fee — ${transaction.project.title}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { transactionId: transaction.id },
    success_url: `${APP_URL}/professional/transactions?paid=1`,
    cancel_url: `${APP_URL}/professional/transactions?cancelled=1`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL.");
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  redirect(session.url);
}
