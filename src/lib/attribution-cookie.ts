/** Cookie name only, in its own import-free file — see guest-cookie.ts for why. Holds where a visitor first came from (utm_* tags / referring site), so a later signup can be credited to a post or channel. */
export const ATTRIBUTION_COOKIE = "glowupp_attr";
/** Same 30 days as the guest, contractor-referral and partner cookies. */
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
