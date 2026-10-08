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
  "GlowUpp arranges payment of what you have earned by bank transfer, after it has received the fee. We may ask for payment details and a few days to check an account before first payment.",
  `We can pause or close an account that misleads people about GlowUpp, refers its own jobs, or otherwise misuses the programme, and can change or end the programme. Questions: ${SUPPORT_EMAIL}.`,
];
