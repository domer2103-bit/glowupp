import { z } from "zod";
import type { AffiliateCategoryKey } from "@/lib/affiliate";

/** What the public /partner/join form offers, mapped to the database category. "Influencer / other" is stored as INFLUENCER. */
export const PUBLIC_CATEGORY_OPTIONS: { value: string; label: string; category: AffiliateCategoryKey }[] = [
  { value: "cafe", label: "Café or coffee shop", category: "CAFE" },
  { value: "gym", label: "Gym or studio", category: "GYM" },
  { value: "garden_center", label: "Garden centre or nursery", category: "GARDEN_CENTER" },
  { value: "salon", label: "Salon or beauty bar", category: "SALON" },
  { value: "trade_supplier", label: "Trade supplier or merchant", category: "TRADE_SUPPLIER" },
  { value: "influencer_other", label: "Influencer or other", category: "INFLUENCER" },
];

export const PARTNER_TERMS_VERSION = "2026-10-08";

const trimmed = (max: number, tooLong: string) => z.string().trim().max(max, tooLong);

export const PartnerSignupSchema = z.object({
  businessName: trimmed(80, "Business name is too long.").min(2, "Enter your business name."),
  contactName: trimmed(80, "Name is too long.").min(2, "Enter your name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(120, "Email is too long."),
  // WhatsApp-friendly: digits with an optional +, spaces, dashes and brackets.
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9(][0-9\s()-]{6,24}$/, "Enter a phone or WhatsApp number we can reach you on."),
  category: z.enum(PUBLIC_CATEGORY_OPTIONS.map((o) => o.value) as [string, ...string[]], { message: "Choose what kind of business you run." }),
  acceptTerms: z.literal(true, { message: "Please tick the box to accept the partner terms." }),
});

export type PartnerSignupInput = z.infer<typeof PartnerSignupSchema>;

export function publicCategoryToDb(value: string): AffiliateCategoryKey {
  return PUBLIC_CATEGORY_OPTIONS.find((o) => o.value === value)?.category ?? "OTHER";
}

/** Browsers send a ticked checkbox as "on" (form POST) or true (JSON). */
export function parseCheckbox(value: unknown): boolean {
  return value === true || value === "on" || value === "true" || value === "1";
}

/**
 * Same-site check for the public sign-up POST: a request from another site's
 * page must not create accounts or set cookies in a visitor's browser. The
 * Origin must match one of the hosts this app is served on — the Host header,
 * X-Forwarded-Host (set by the reverse proxy) or the configured APP_URL, with
 * or without "www." (both glowupp.co.uk and www.glowupp.co.uk serve the
 * site). A request with no Origin header (some privacy tools, curl) is
 * allowed — the rate limit and honeypot cover that.
 */
export function isSameOrigin(originHeader: string | null, allowedHosts: (string | null | undefined)[]): boolean {
  if (!originHeader) return true;
  try {
    const bare = (h: string) => h.toLowerCase().replace(/^www\./, "");
    const origin = bare(new URL(originHeader).host);
    return allowedHosts.some((h) => !!h && bare(h.trim()) === origin);
  } catch {
    return false;
  }
}
