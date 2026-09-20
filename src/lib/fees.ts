/**
 * Phase 11's lead-fee calculation — the only piece of "money logic" in
 * the codebase, and deliberately just arithmetic, not a payment charge.
 * See docs/BACKEND_ARCHITECTURE.md §23 for why a percentage-of-winning-quote
 * model was chosen over a flat per-lead fee.
 */
export const LEAD_FEE_RATE = 0.05;

/** Rounds to the nearest penny, same convention as poundsToPence in src/lib/money.ts. */
export function calculateLeadFee(quoteAmountPence: number): number {
  return Math.round(quoteAmountPence * LEAD_FEE_RATE);
}
