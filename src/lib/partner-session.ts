import { createHash, randomBytes } from "node:crypto";

/**
 * Magic-link login for B2B partners (no password). The emailed token is 32
 * random bytes; only its SHA-256 is stored (AffiliateLoginToken.tokenHash),
 * so a leaked database cannot be used to log in. The same token is what the
 * browser keeps in an httpOnly cookie after /partner/enter swaps the link
 * for a session. A partner may hold several valid tokens at once (see
 * AffiliateLoginToken).
 * Pure helpers, no request or database access: see src/lib/data/affiliates.ts.
 */
export const PARTNER_COOKIE = "glowupp_partner";
/** How long a browser stays signed in after using a magic link. */
export const PARTNER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
/** How long an emailed link stays usable. A partner who lets it lapse just asks for a new one on /partner/login. */
export const LOGIN_TOKEN_TTL_DAYS = 180;

export function generateLoginToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashLoginToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cheap shape check before hitting the database: a base64url token of the length we mint. */
export function isPlausibleLoginToken(token: string | null | undefined): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function loginTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + LOGIN_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function buildDashboardLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/partner/dashboard?token=${token}`;
}
