/** Cookie name only, in its own import-free file — see guest-cookie.ts for why. Holds the referral code of the B2B affiliate partner whose link/QR (/a/[code]) the visitor opened. */
export const AFFILIATE_COOKIE = "glowupp_affiliate";
/** How long an opened partner link keeps crediting that partner. Matches the contractor-referral and guest cookies. */
export const AFFILIATE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
