import { AFFILIATE_MIN_PAYOUT_PENCE } from "@/lib/affiliate";
import { formatPence } from "@/lib/money";

/**
 * Plain-English partner terms shown on /partner/join and accepted with a
 * checkbox (recorded as AffiliatePartner.termsAcceptedAt). DRAFT wording
 * that describes only what the system actually does — have it reviewed
 * before relying on it as a legal agreement, and bump PARTNER_TERMS_VERSION
 * (src/lib/partner-signup.ts) whenever it changes.
 */
export const SUPPORT_EMAIL = "hello@glowupp.co.uk";

export const PARTNER_TERMS: string[] = [
  "You earn 50% of the lead fee GlowUpp actually collects from a professional on a job booked by a homeowner who started through your link or QR code. The first partner link a homeowner opens (within 30 days) is the one credited.",
  "If a job carries no fee (for example a professional's free introductory jobs), or the fee is cancelled or reversed, there is no share on it. A share already credited is withdrawn if its fee is reversed.",
  "Your dashboard shows your visits, the redesigns started through your link, jobs booked, and what you have earned and been paid.",
  `We pay what you have earned by bank transfer, once we have checked your account and have your payment details, and once at least ${formatPence(AFFILIATE_MIN_PAYOUT_PENCE)} is waiting for you. Shares are only ever paid on fees GlowUpp has actually received.`,
  "Jobs where the homeowner or the professional is you, or shares your email address or phone number, do not earn a share.",
  "If you promote GlowUpp online (for example in a social media post), make it clear it is an advert by starting the post with \"#ad\" or \"Ad\", and do not make claims about GlowUpp (such as about price, speed or results) that are untrue or that we have not agreed.",
  `We can pause or close an account that misleads people about GlowUpp or otherwise misuses the programme, and can change or end the programme. Questions: ${SUPPORT_EMAIL}.`,
];
