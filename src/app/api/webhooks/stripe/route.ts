import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { TransactionStatus } from "@/generated/prisma/client";
import { notifyLeadFeePaid } from "@/lib/notifications";
import { creditAffiliateForTransaction } from "@/lib/data/affiliates";
import { syncSubscriptionFromStripe } from "@/lib/data/subscriptions";

/**
 * Stripe webhook — the only source of truth for a Transaction moving to
 * PAID. The Checkout success_url redirect (src/lib/actions/payments.ts)
 * is just where the professional's browser ends up; it isn't trusted to
 * confirm payment, since a user can land on a success URL without
 * actually paying (back button, shared link, etc.).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Pro plan: Checkout finished for a subscription, or Stripe changed/ended one.
  // The subscription object in the event carries the whole state, so we store it as given.
  if (event.type === "checkout.session.completed" && (event.data.object as Stripe.Checkout.Session).mode === "subscription") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subscriptionId) {
      console.error("[stripe webhook] subscription checkout with no subscription id", session.id);
      return NextResponse.json({ received: true });
    }
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const synced = await syncSubscriptionFromStripe(sub);
    if (synced) {
      await prisma.activityLog.create({
        data: { type: "pro_subscription_started", actorId: null, metadata: { professionalId: synced.professionalId, stripeSubscriptionId: sub.id } },
      }).catch((err) => console.error("[stripe webhook] activity log failed", err));
    } else {
      console.error("[stripe webhook] could not match subscription to a professional", sub.id);
    }
    return NextResponse.json({ received: true });
  }
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const synced = await syncSubscriptionFromStripe(sub);
    if (!synced) console.error("[stripe webhook] subscription event for unknown professional", sub.id);
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const transactionId = session.metadata?.transactionId;
    if (!transactionId) {
      console.error("[stripe webhook] checkout.session.completed with no transactionId metadata", session.id);
      return NextResponse.json({ received: true });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { professional: { include: { user: true } }, project: true },
    });
    if (!transaction) {
      console.error("[stripe webhook] no transaction found for id", transactionId);
      return NextResponse.json({ received: true });
    }

    // Idempotency: Stripe can and does redeliver events. Only act once.
    if (transaction.status !== TransactionStatus.PAID) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.PAID,
          paidAt: new Date(),
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
        },
      });

      await prisma.activityLog.create({
        data: {
          type: "lead_fee_paid",
          actorId: transaction.professional.userId,
          projectId: transaction.projectId,
          metadata: { transactionId: transaction.id, feeAmount: transaction.feeAmount },
        },
      });

      // B2B affiliate partner's share of this fee, if the homeowner came
      // via a partner link. Must not fail the webhook: the fee is already
      // recorded as paid, and Stripe would retry a 500 forever.
      try {
        await creditAffiliateForTransaction(transaction.id);
      } catch (err) {
        console.error("[stripe webhook] affiliate credit failed for transaction", transaction.id, err);
      }

      await notifyLeadFeePaid({
        professionalEmail: transaction.professional.user.email,
        professionalName: transaction.professional.user.name,
        projectTitle: transaction.project.title,
        feeAmountPence: transaction.feeAmount,
      });
    }
  }

  return NextResponse.json({ received: true });
}
