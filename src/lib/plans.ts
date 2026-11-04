/**
 * Paid plans for professionals. Pure constants and helpers (no database, no
 * Stripe) so the pricing page, the checkout action, the webhook and the tests
 * all read the same numbers.
 *
 * Only Pro can be bought today. Max is shown on the pricing page as "coming
 * soon" and has no price object here on purpose: nothing can charge for it.
 *
 * Marketplace commission (2%, cap £250, src/lib/fees.ts) is the same on every
 * plan. Pro removes the fee on the professional's OWN clients (private link /
 * QR jobs) and adds a Pro badge plus listing priority for homeowners comparing
 * quotes.
 */

export type BillingIntervalKey = "month" | "year";

/** List prices, in pence. Shown struck through while the launch price applies. */
export const PRO_LIST_PRICE_PENCE: Record<BillingIntervalKey, number> = { month: 3_900, year: 39_000 };

/**
 * Launch prices, in pence. Checkout creates the Stripe price inline with this
 * amount, so a subscriber keeps paying it for as long as they stay subscribed
 * (that is the "locked in" promise); they are not repriced when launch ends.
 */
export const PRO_LAUNCH_PRICE_PENCE: Record<BillingIntervalKey, number> = { month: 2_900, year: 29_000 };

/** Max is display-only for now. */
export const MAX_LIST_PRICE_PENCE = 9_900;
export const MAX_LAUNCH_PRICE_PENCE = 6_900;

/** The two months a yearly Pro subscriber does not pay for (12 x monthly - yearly), in pence. */
export function yearlySavingPence(): number {
  return PRO_LAUNCH_PRICE_PENCE.month * 12 - PRO_LAUNCH_PRICE_PENCE.year;
}

/** The accepted-quote total in a month at which Pro costs less than the 2% fee on own-client jobs. */
export function breakEvenQuotePence(ratePct = 2): number {
  return Math.ceil(PRO_LAUNCH_PRICE_PENCE.month / (ratePct / 100));
}

export type StoredSubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "INACTIVE";

/**
 * Whether the plan's benefits apply right now. A payment that has failed
 * (PAST_DUE) keeps the benefits while Stripe retries; they stop when Stripe
 * ends the subscription (CANCELED/INACTIVE). Cancelling at the end of the
 * period leaves the status ACTIVE until the period actually ends.
 */
export function isProActive(sub: { status: StoredSubscriptionStatus } | null | undefined): boolean {
  return sub?.status === "ACTIVE" || sub?.status === "PAST_DUE";
}

/** Our stored status for a Stripe subscription status string. */
export function mapStripeStatus(stripeStatus: string): StoredSubscriptionStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    default:
      return "INACTIVE"; // incomplete, incomplete_expired, paused
  }
}

export function intervalFromStripe(interval: string | null | undefined): "MONTH" | "YEAR" {
  return interval === "year" ? "YEAR" : "MONTH";
}
