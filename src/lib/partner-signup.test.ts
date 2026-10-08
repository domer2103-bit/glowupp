import { describe, expect, it } from "vitest";
import { PUBLIC_CATEGORY_OPTIONS, PartnerSignupSchema, isSameOrigin, parseCheckbox, publicCategoryToDb } from "./partner-signup";
import { AFFILIATE_CATEGORIES } from "./affiliate";

const valid = { businessName: "Kite Coffee", contactName: "Sam Taylor", email: "Sam@KiteCoffee.co.uk ", phone: "07700 900123", category: "cafe", acceptTerms: true };

describe("PartnerSignupSchema", () => {
  it("accepts the five fields plus the terms tick, tidying the email", () => {
    const r = PartnerSignupSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBe("sam@kitecoffee.co.uk");
  });

  it.each(["07700 900123", "+44 7700 900123", "(020) 7946-0958", "07700900123"])("accepts the phone/WhatsApp number %s", (phone) => {
    expect(PartnerSignupSchema.safeParse({ ...valid, phone }).success).toBe(true);
  });

  it.each(["", "abc", "12345", "phone: 0770", "0770 900 123 ext. <b>"])("rejects the phone %s", (phone) => {
    expect(PartnerSignupSchema.safeParse({ ...valid, phone }).success).toBe(false);
  });

  it("rejects missing/short names, a bad email, an unknown category and an unticked box", () => {
    expect(PartnerSignupSchema.safeParse({ ...valid, businessName: "K" }).success).toBe(false);
    expect(PartnerSignupSchema.safeParse({ ...valid, contactName: "" }).success).toBe(false);
    expect(PartnerSignupSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(PartnerSignupSchema.safeParse({ ...valid, category: "spaceship" }).success).toBe(false);
    expect(PartnerSignupSchema.safeParse({ ...valid, acceptTerms: false }).success).toBe(false);
    expect(PartnerSignupSchema.safeParse({ ...valid, businessName: "x".repeat(81) }).success).toBe(false);
  });
});

describe("categories", () => {
  it("offers the six public choices and maps each to a real database category", () => {
    expect(PUBLIC_CATEGORY_OPTIONS.map((o) => o.value)).toEqual(["cafe", "gym", "garden_center", "salon", "trade_supplier", "influencer_other"]);
    for (const o of PUBLIC_CATEGORY_OPTIONS) expect(AFFILIATE_CATEGORIES).toContain(publicCategoryToDb(o.value));
    expect(publicCategoryToDb("trade_supplier")).toBe("TRADE_SUPPLIER");
    expect(publicCategoryToDb("influencer_other")).toBe("INFLUENCER");
    expect(publicCategoryToDb("unknown")).toBe("OTHER");
  });
});

describe("helpers", () => {
  it("reads a checkbox the way browsers and JSON send it", () => {
    for (const yes of ["on", true, "true", "1"]) expect(parseCheckbox(yes)).toBe(true);
    for (const no of [undefined, "", "off", false, null, "no"]) expect(parseCheckbox(no)).toBe(false);
  });

  it("accepts only same-site form posts (a missing Origin is allowed)", () => {
    const hosts = ["www.glowupp.co.uk"];
    expect(isSameOrigin("https://www.glowupp.co.uk", hosts)).toBe(true);
    expect(isSameOrigin("https://glowupp.co.uk", hosts)).toBe(true); // apex and www both serve the site
    expect(isSameOrigin("https://evil.example", hosts)).toBe(false);
    expect(isSameOrigin("https://www.glowupp.co.uk.evil.example", hosts)).toBe(false);
    expect(isSameOrigin("https://evilglowupp.co.uk", hosts)).toBe(false);
    expect(isSameOrigin("not a url", hosts)).toBe(false);
    expect(isSameOrigin(null, hosts)).toBe(true);
    expect(isSameOrigin("https://www.glowupp.co.uk", [null, undefined])).toBe(false);
  });

  it("also trusts the proxy's forwarded host and the configured app host", () => {
    expect(isSameOrigin("https://www.glowupp.co.uk", ["internal:3000", "www.glowupp.co.uk", "localhost:3000"])).toBe(true);
    expect(isSameOrigin("http://localhost:3000", ["glowupp.test", null, "localhost:3000"])).toBe(true);
  });
});

describe("partner terms", () => {
  it("require paid promotion to be labelled as an ad, and carry a version", async () => {
    const { PARTNER_TERMS } = await import("./partner-terms");
    const { PARTNER_TERMS_VERSION } = await import("./partner-signup");
    expect(PARTNER_TERMS.some((t) => t.includes('"#ad"') && /advert/i.test(t))).toBe(true);
    expect(PARTNER_TERMS.some((t) => t.includes("£25"))).toBe(true);
    // Professional referrals: what is earned, that promotions earn nothing, and that one fee is never shared twice.
    expect(PARTNER_TERMS.some((t) => /tradespeople who create a GlowUpp professional account/.test(t))).toBe(true);
    expect(PARTNER_TERMS.some((t) => /free introductory jobs/.test(t) && /earn no share/.test(t))).toBe(true);
    expect(PARTNER_TERMS.some((t) => /at most/.test(t))).toBe(true);
    expect(PARTNER_TERMS.some((t) => /first 12 months after they sign up/.test(t))).toBe(true); // follows PRO_REFERRAL_EARNING_MONTHS
    expect(PARTNER_TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}(\.\d+)?$/);
  });
});
