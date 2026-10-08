import { generateReferralCode, generateVanSlug, isValidVanSlug, normalizeReferralCode } from "@/lib/referral";

/**
 * Pure helpers for the B2B Affiliate & Partner Program. No database or
 * request access here — see src/lib/data/affiliates.ts for that.
 *
 * The deal: a partner earns `revenueShareRate` (50% by default) of the lead
 * fee GlowUpp actually collects (src/lib/fees.ts) on jobs booked by
 * homeowners they brought in. Whatever the fee turned out to be — 5%
 * marketplace, 1% private-link, or £0 for a free job — the partner gets
 * half of it, so a free job earns the partner nothing.
 */
export const AFFILIATE_DEFAULT_SHARE_RATE = 0.5;

/**
 * Partner's share of a collected fee, in whole pence. Rounds DOWN: GlowUpp
 * never pays out a fraction of a penny it didn't receive (£25.01 x 50% =
 * £12.50). The small epsilon stops float error turning 12.5 into 12.499999.
 */
export function calculateAffiliateShare(feePence: number, rate: number = AFFILIATE_DEFAULT_SHARE_RATE): number {
  if (!Number.isFinite(feePence) || !Number.isFinite(rate) || feePence <= 0 || rate <= 0) return 0;
  return Math.floor(feePence * Math.min(rate, 1) + 1e-9);
}

/** What GlowUpp still owes the partner. Negative means a fee was reversed after they'd already been paid (a clawback to settle by hand). */
export function affiliateBalancePence(partner: { totalEarningsPence: number; paidEarningsPence: number }): number {
  return partner.totalEarningsPence - partner.paidEarningsPence;
}

export const AFFILIATE_CATEGORIES = ["CAFE", "GYM", "GARDEN_CENTER", "SALON", "TRADE_SUPPLIER", "INFLUENCER", "OTHER"] as const;
export type AffiliateCategoryKey = (typeof AFFILIATE_CATEGORIES)[number];

export const AFFILIATE_CATEGORY_LABELS: Record<AffiliateCategoryKey, string> = {
  CAFE: "Café",
  GYM: "Gym / studio",
  GARDEN_CENTER: "Garden centre",
  SALON: "Salon",
  TRADE_SUPPLIER: "Trade supplier",
  INFLUENCER: "Influencer",
  OTHER: "Other",
};

/** Poster/sticker headline per kind of partner — an admin can edit it in the asset generator before downloading. */
export const AFFILIATE_DEFAULT_HEADLINES: Record<AffiliateCategoryKey, string> = {
  CAFE: "Bored waiting for your latte? Scan to see your dream living room",
  GYM: "Cooling down? Scan to see your dream living room",
  GARDEN_CENTER: "Not sure how it looks in your garden? Scan to find out",
  SALON: "Stuck in the chair? Scan to see your dream kitchen",
  TRADE_SUPPLIER: "Picking materials? Scan to see how they'll look in your home",
  INFLUENCER: "Redesign your home in seconds with AI",
  OTHER: "Redesign your home in seconds with AI",
};

/** A partner link is /a/<qrSlug>; the route also accepts the 8-char referral code. */
export function buildAffiliateLink(origin: string, qrSlug: string): string {
  return `${origin.replace(/\/+$/, "")}/a/${qrSlug}`;
}

/** Fresh identifiers for a new partner. The caller retries on the (astronomically unlikely) unique-index collision. */
export function generateAffiliateIdentifiers(businessName: string): { referralCode: string; qrSlug: string } {
  return { referralCode: generateReferralCode(), qrSlug: generateVanSlug(businessName) };
}

/** What /a/[code] was given: a slug (always contains a hyphen), an 8-char referral code, or junk. */
export function classifyAffiliateCode(input: string | null | undefined): { kind: "slug"; value: string } | { kind: "code"; value: string } | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  if (raw.includes("-")) {
    const slug = raw.toLowerCase();
    return isValidVanSlug(slug) ? { kind: "slug", value: slug } : null;
  }
  const code = normalizeReferralCode(raw);
  return code ? { kind: "code", value: code } : null;
}

/** Where a partner's link lands the visitor: the category chooser, tagged so Plausible shows which partner sent them. */
export function affiliateLandingPath(qrSlug: string): string {
  return `/?utm_source=affiliate&utm_medium=qr&utm_campaign=${encodeURIComponent(qrSlug)}#categories`;
}
