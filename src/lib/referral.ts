import { randomInt } from "node:crypto";

/**
 * Pure helpers for the contractor referral link/QR (Private Client
 * Pipeline). No database or request access here — see
 * src/lib/data/private-pipeline.ts for that.
 */

// 32 symbols, no 0/O/1/I — a code is read off a van door or clipboard and
// typed by hand as often as it's scanned.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const REFERRAL_CODE_LENGTH = 8;

export function generateReferralCode(length = REFERRAL_CODE_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Cleans up user-typed/URL input into canonical form, or null if it can't be a valid code. Lookup is always by the canonical value so `abc23def` and ` ABC23DEF ` find the same professional. */
export function normalizeReferralCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const code = input.trim().toUpperCase();
  if (code.length !== REFERRAL_CODE_LENGTH) return null;
  for (const ch of code) if (!ALPHABET.includes(ch)) return null;
  return code;
}

/** "Smith & Sons Kitchens Ltd." -> "smith-sons-kitchens-ltd" */
export function slugifyBusinessName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug || "pro";
}

/** Slug plus a short random suffix so two businesses with the same name never collide and the slug can't be guessed from the name alone. */
export function generateVanSlug(businessName: string): string {
  return `${slugifyBusinessName(businessName)}-${generateReferralCode(4).toLowerCase()}`;
}

/** Slugs we mint always end in -xxxx; the route only accepts that shape. */
export function isValidVanSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 60;
}

export function buildReferralLinks(origin: string, referralCode: string, vanQrSlug: string) {
  const base = origin.replace(/\/+$/, "");
  return { shortLink: `${base}/q/${referralCode}`, vanLink: `${base}/pro/${vanQrSlug}/quote` };
}

export function isLockActive(session: { lockStatus: "ACTIVE" | "EXPIRED"; expiresAt: Date | null }, now: Date = new Date()): boolean {
  if (session.lockStatus !== "ACTIVE") return false;
  return session.expiresAt === null || session.expiresAt.getTime() > now.getTime();
}
