/** Cookie name only, in its own import-free file — see guest-cookie.ts for why. Holds the referral code of the contractor whose link/QR the visitor scanned. */
export const PRO_REF_COOKIE = "glowupp_pro_ref";
/** How long a scanned link keeps pointing a new project at that contractor. Matches the guest cookie's lifetime. */
export const PRO_REF_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
