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

/** Rounds to the nearest penny, same convention as poundsToPence in src/lib/money.ts. */
export function calculateLeadFee(quoteAmountPence: number): number {
  return Math.min(Math.round(quoteAmountPence * LEAD_FEE_RATE), LEAD_FEE_CAP_PENCE);
}
