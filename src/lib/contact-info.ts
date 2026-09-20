/**
 * Loose, non-blocking detector for phone numbers/emails in message text
 * — used only to show a gentle "keep it in GlowUpp" reminder
 * (`sendMessage`, `src/lib/actions/messages.ts`), never to block sending.
 * Deliberately not airtight: a hard filter would be trivial to dodge
 * anyway (spelled-out digits, "at" instead of "@") and would frustrate
 * honest users typing an address or a reference number. False positives
 * are harmless here (just an extra tip shown); false negatives are
 * expected and fine.
 */
const PHONE_PATTERN = /\d[\d\s\-().]{5,}\d/;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

export function containsLikelyContactInfo(text: string): boolean {
  return PHONE_PATTERN.test(text) || EMAIL_PATTERN.test(text);
}
