/**
 * Phase 11's lead-fee calculation — the only piece of "money logic" in
 * the codebase, and deliberately just arithmetic, not a payment charge.
 * See docs/BACKEND_ARCHITECTURE.md §23 for why a percentage-of-winning-quote
 * model was chosen over a flat per-lead fee.
 */
export const LEAD_FEE_RATE = 0.05;

/**
 * Caps the fee on large jobs (uncapped, 5% of a £30k renovation is £1,500
 * — enough to make a professional walk away from a lead source they
 * haven't gotten value from yet). £250 in pence.
 */
export const LEAD_FEE_CAP_PENCE = 25_000;

/**
 * Private-link jobs (the contractor's own client, brought in through their
 * referral link/QR) are charged far less than marketplace leads: the first
 * PRIVATE_LINK_FREE_JOBS of them are free, then 1% of the accepted quote
 * (same £250 cap).
 */
export const PRIVATE_LINK_FEE_RATE = 0.01;
export const PRIVATE_LINK_FREE_JOBS = 3;

/** Stripe won't create a GBP Checkout session below 30p, so a fee smaller than this is waived rather than left uncollectable. */
export const MIN_CHARGEABLE_FEE_PENCE = 30;

/**
 * Early-bird offer: a professional whose GlowUpp account was created before
 * Black Friday 2026 (Fri 27 Nov, 00:00 UK time — GMT, so the same instant in
 * UTC) pays no commission on their first EARLY_BIRD_FREE_JOBS marketplace
 * jobs. It sits on top of the private-link rule above, which is unchanged.
 */
export const EARLY_BIRD_CUTOFF = new Date("2026-11-27T00:00:00.000Z");
export const EARLY_BIRD_FREE_JOBS = 2;

export function isEarlyBird(accountCreatedAt: Date): boolean {
  return accountCreatedAt.getTime() < EARLY_BIRD_CUTOFF.getTime();
}

/** Rounds to the nearest penny, same convention as poundsToPence in src/lib/money.ts. */
export function calculateLeadFee(quoteAmountPence: number, rate: number = LEAD_FEE_RATE): number {
  return Math.min(Math.round(quoteAmountPence * rate), LEAD_FEE_CAP_PENCE);
}

/**
 * Fee for a private-link job. `priorPrivateJobs` is how many private-link
 * jobs this professional has already been selected for (cancelled
 * selections don't count — see countPriorPrivateLinkJobs).
 */
export function calculatePrivateLinkFee(quoteAmountPence: number, priorPrivateJobs: number): number {
  if (priorPrivateJobs < PRIVATE_LINK_FREE_JOBS) return 0;
  const fee = calculateLeadFee(quoteAmountPence, PRIVATE_LINK_FEE_RATE);
  return fee < MIN_CHARGEABLE_FEE_PENCE ? 0 : fee;
}

/**
 * Fee for a marketplace job: free for an early-bird professional's first
 * EARLY_BIRD_FREE_JOBS jobs, otherwise the normal 5% (capped). `priorMarketplaceJobs`
 * counts their earlier non-cancelled marketplace selections, free ones included.
 */
export function calculateMarketplaceFee(quoteAmountPence: number, priorMarketplaceJobs: number, accountCreatedAt: Date): number {
  if (isEarlyBird(accountCreatedAt) && priorMarketplaceJobs < EARLY_BIRD_FREE_JOBS) return 0;
  return calculateLeadFee(quoteAmountPence);
}
