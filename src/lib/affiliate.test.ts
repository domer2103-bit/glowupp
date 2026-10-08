import { describe, expect, it } from "vitest";
import {
  AFFILIATE_MIN_PAYOUT_PENCE,
  affiliateBalancePence,
  affiliateLandingPath,
  buildAffiliateLink,
  calculateAffiliateShare,
  classifyAffiliateCode,
  generateAffiliateIdentifiers,
  normalizeEmail,
  normalizePhone,
  payoutBlock,
  sharesIdentity,
} from "./affiliate";
import { normalizeReferralCode } from "./referral";

describe("calculateAffiliateShare (partner earns 50% of the fee GlowUpp collected)", () => {
  it("splits the brief's example: £500 job at 5% = £25 fee -> £12.50 to the partner", () => {
    expect(calculateAffiliateShare(2500)).toBe(1250);
  });

  it("works on a 1% private-link fee as well", () => {
    expect(calculateAffiliateShare(2450)).toBe(1225); // £2,450 quote -> £24.50 fee -> £12.25
  });

  it("rounds down to a whole penny, never overpaying", () => {
    expect(calculateAffiliateShare(2501)).toBe(1250);
    expect(calculateAffiliateShare(1)).toBe(0);
  });

  it("earns nothing on a free job (£0 fee) or a nonsense fee", () => {
    expect(calculateAffiliateShare(0)).toBe(0);
    expect(calculateAffiliateShare(-500)).toBe(0);
    expect(calculateAffiliateShare(Number.NaN)).toBe(0);
  });

  it("honours a custom rate, and never pays more than the whole fee", () => {
    expect(calculateAffiliateShare(10000, 0.3)).toBe(3000);
    expect(calculateAffiliateShare(10000, 0.25)).toBe(2500);
    expect(calculateAffiliateShare(10000, 1.7)).toBe(10000);
    expect(calculateAffiliateShare(10000, 0)).toBe(0);
  });

  it("is exact for the full range of capped fees (up to £250)", () => {
    for (let fee = 0; fee <= 25000; fee += 37) expect(calculateAffiliateShare(fee)).toBe(Math.floor(fee / 2));
  });
});

describe("affiliateBalancePence", () => {
  it("is earned minus paid, and can go negative after a reversal", () => {
    expect(affiliateBalancePence({ totalEarningsPence: 5000, paidEarningsPence: 1250 })).toBe(3750);
    expect(affiliateBalancePence({ totalEarningsPence: 0, paidEarningsPence: 1250 })).toBe(-1250);
  });
});

describe("partner identifiers and links", () => {
  it("mints a referral code the contractor-referral code reader accepts, and a readable slug", () => {
    const { referralCode, qrSlug } = generateAffiliateIdentifiers("The Daily Grind Café & Bakery");
    expect(normalizeReferralCode(referralCode)).toBe(referralCode);
    expect(qrSlug).toMatch(/^the-daily-grind-cafe-and-bakery-[a-z2-9]{4}$/);
  });

  it("builds the printed QR link", () => {
    expect(buildAffiliateLink("https://www.glowupp.co.uk/", "grind-ab12")).toBe("https://www.glowupp.co.uk/a/grind-ab12");
  });

  it("tells slugs from codes and rejects junk", () => {
    expect(classifyAffiliateCode("grind-ab12")).toEqual({ kind: "slug", value: "grind-ab12" });
    expect(classifyAffiliateCode("  Grind-AB12 ")).toEqual({ kind: "slug", value: "grind-ab12" });
    expect(classifyAffiliateCode("abc23def")).toEqual({ kind: "code", value: "ABC23DEF" });
    expect(classifyAffiliateCode("abc10def")).toBeNull(); // 0 and 1 are not in the alphabet
    expect(classifyAffiliateCode("../../etc")).toBeNull();
    expect(classifyAffiliateCode("")).toBeNull();
    expect(classifyAffiliateCode(undefined)).toBeNull();
  });

  it("tags the landing URL so Plausible shows which partner sent the visitor", () => {
    expect(affiliateLandingPath("grind-ab12")).toBe("/?utm_source=affiliate&utm_medium=qr&utm_campaign=grind-ab12#categories");
  });
});

describe("payoutBlock (verified partner, at least £25 waiting)", () => {
  const ok = new Date("2026-10-08T12:00:00Z");
  it("blocks an unverified partner whatever their balance", () => {
    expect(payoutBlock({ verifiedAt: null, balancePence: 1_000_000 })).toEqual({ reason: "UNVERIFIED" });
  });
  it("blocks a verified partner below the minimum and says how far short", () => {
    expect(AFFILIATE_MIN_PAYOUT_PENCE).toBe(2500);
    expect(payoutBlock({ verifiedAt: ok, balancePence: 1250 })).toEqual({ reason: "BELOW_MINIMUM", shortByPence: 1250 });
    expect(payoutBlock({ verifiedAt: ok, balancePence: 2499 })).toEqual({ reason: "BELOW_MINIMUM", shortByPence: 1 });
    expect(payoutBlock({ verifiedAt: ok, balancePence: 0 })).toEqual({ reason: "BELOW_MINIMUM", shortByPence: 2500 });
    expect(payoutBlock({ verifiedAt: ok, balancePence: -500 })).toEqual({ reason: "BELOW_MINIMUM", shortByPence: 2500 });
  });
  it("allows a verified partner at or above the minimum", () => {
    expect(payoutBlock({ verifiedAt: ok, balancePence: 2500 })).toBeNull();
    expect(payoutBlock({ verifiedAt: ok, balancePence: 12345 })).toBeNull();
  });
});

describe("self-referral detection", () => {
  it("treats the same mailbox as the same person, ignoring case, +tags and Gmail dots", () => {
    expect(normalizeEmail(" Sam.Taylor+kite@GoogleMail.com ")).toBe("samtaylor@gmail.com");
    expect(normalizeEmail("sam@kitecoffee.co.uk")).toBe("sam@kitecoffee.co.uk");
    expect(normalizeEmail("sam.taylor@kitecoffee.co.uk")).toBe("sam.taylor@kitecoffee.co.uk"); // dots only ignored for Gmail
    for (const bad of [null, undefined, "", "nope", "@x.com", "a@"]) expect(normalizeEmail(bad)).toBeNull();
  });

  it("treats every way of writing one UK number as equal, and refuses numbers too short to identify anyone", () => {
    const same = ["07700 900123", "+44 7700 900123", "0044 7700 900123", "+44 (0)7700 900123", "(07700) 900-123", "447700900123"];
    for (const p of same) expect(normalizePhone(p)).toBe("7700900123");
    expect(normalizePhone("07700 900124")).toBe("7700900124");
    for (const bad of [null, undefined, "", "abc", "12345", "0770"]) expect(normalizePhone(bad)).toBeNull();
  });

  it("flags two records that share an email or a phone number, and nothing else", () => {
    const partner = { email: "sam@kitecoffee.co.uk", phone: "07700 900123" };
    expect(sharesIdentity(partner, { email: "SAM@kitecoffee.co.uk", phone: null })).toBe(true);
    expect(sharesIdentity(partner, { email: "other@x.com", phone: "+44 7700 900123" })).toBe(true);
    expect(sharesIdentity(partner, { email: "other@x.com", phone: "07700 900124" })).toBe(false);
    expect(sharesIdentity(partner, { email: null, phone: null })).toBe(false);
    expect(sharesIdentity({ email: "a@b.com", phone: null }, { email: null, phone: null })).toBe(false);
    expect(sharesIdentity({ email: null, phone: null }, { email: null, phone: null })).toBe(false); // missing data never matches
  });
});
