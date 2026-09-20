import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { TransactionStatus } from "@/generated/prisma/client";
import { notifyLeadFeePaid } from "@/lib/notifications";

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
