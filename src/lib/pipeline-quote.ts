import { poundsToPence } from "@/lib/money";

/**
 * Validation/maths for a private-pipeline quote: an itemised list plus an
 * optional deposit the client is asked to pay directly to the contractor.
 * All amounts are integer pence (see money.ts). GlowUpp records the
 * deposit request but never processes the payment.
 */

export type QuoteLineItem = { description: string; amountPence: number };

export const MAX_LINE_ITEMS = 30;
export const MAX_QUOTE_PENCE = 100_000_000; // £1m — a typo guard, not a business rule

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Accepts rows as typed in the form (description + pounds as a string/number). Blank rows are skipped so an empty trailing row isn't an error. */
export function parseLineItems(rows: { description: string; amount: string | number }[]): ParseResult<QuoteLineItem[]> {
  const items: QuoteLineItem[] = [];
  for (const row of rows) {
    const description = row.description.trim();
    const rawAmount = typeof row.amount === "number" ? String(row.amount) : row.amount.trim();
    if (!description && !rawAmount) continue;
    if (!description) return { ok: false, error: "Every line item needs a description." };
    const pounds = Number(rawAmount);
    if (!rawAmount || !Number.isFinite(pounds) || pounds <= 0) return { ok: false, error: `Enter a valid amount for "${description}".` };
    if (description.length > 200) return { ok: false, error: "Line item descriptions must be 200 characters or fewer." };
    items.push({ description, amountPence: poundsToPence(pounds) });
  }
  if (items.length === 0) return { ok: false, error: "Add at least one line item." };
  if (items.length > MAX_LINE_ITEMS) return { ok: false, error: `A quote can have at most ${MAX_LINE_ITEMS} line items.` };
  const total = sumLineItems(items);
  if (total > MAX_QUOTE_PENCE) return { ok: false, error: "That total looks too large — please check the amounts." };
  return { ok: true, value: items };
}

export function sumLineItems(items: QuoteLineItem[]): number {
  return items.reduce((sum, i) => sum + i.amountPence, 0);
}

/** Deposit is optional; when present it must be positive and no more than the quote total. */
export function validateDeposit(depositPence: number | null, totalPence: number): ParseResult<number | null> {
  if (depositPence === null) return { ok: true, value: null };
  if (!Number.isInteger(depositPence) || depositPence <= 0) return { ok: false, error: "Enter a deposit amount greater than zero, or leave it blank." };
  if (depositPence > totalPence) return { ok: false, error: "The deposit can't be more than the quote total." };
  return { ok: true, value: depositPence };
}

/** Reads the stored JSON column back into typed items, dropping anything malformed rather than throwing on a bad row. */
export function readLineItems(json: unknown): QuoteLineItem[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((v) => {
    if (typeof v !== "object" || v === null) return [];
    const { description, amountPence } = v as Record<string, unknown>;
    return typeof description === "string" && Number.isInteger(amountPence) ? [{ description, amountPence: amountPence as number }] : [];
  });
}
