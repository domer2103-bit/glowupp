import { describe, expect, it } from "vitest";
import { buildReferralLinks, generateReferralCode, generateVanSlug, isLockActive, isValidVanSlug, normalizeReferralCode, slugifyBusinessName } from "./referral";

describe("referral codes", () => {
  it("generates 8 unambiguous characters that round-trip through normalize", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateReferralCode();
      expect(code).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
      expect(normalizeReferralCode(code)).toBe(code);
    }
  });
  it("normalizes case and whitespace", () => {
    expect(normalizeReferralCode(" abc23def ")).toBe("ABC23DEF");
  });
  it("rejects wrong length, ambiguous characters and empty input", () => {
    expect(normalizeReferralCode("ABC23DE")).toBeNull();
    expect(normalizeReferralCode("ABC23DEF9")).toBeNull();
    expect(normalizeReferralCode("ABC23DE0")).toBeNull();
    expect(normalizeReferralCode("ABC23DEI")).toBeNull();
    expect(normalizeReferralCode("")).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
    expect(normalizeReferralCode("ABC-23DE")).toBeNull();
  });
});

describe("slugs", () => {
  it("slugifies business names", () => {
    expect(slugifyBusinessName("Smith & Sons Kitchens Ltd.")).toBe("smith-and-sons-kitchens-ltd");
    expect(slugifyBusinessName("  Café   Élan!! ")).toBe("cafe-elan");
    expect(slugifyBusinessName("!!!")).toBe("pro");
    expect(slugifyBusinessName("a".repeat(80)).length).toBeLessThanOrEqual(40);
  });
  it("mints slugs that pass validation", () => {
    for (const name of ["Smith & Sons", "!!!", "x".repeat(100)]) expect(isValidVanSlug(generateVanSlug(name))).toBe(true);
  });
  it("rejects malformed slugs", () => {
    expect(isValidVanSlug("Has Spaces")).toBe(false);
    expect(isValidVanSlug("../etc")).toBe(false);
    expect(isValidVanSlug("UPPER")).toBe(false);
    expect(isValidVanSlug("a".repeat(61))).toBe(false);
  });
});

describe("links and locks", () => {
  it("builds both links without a double slash", () => {
    expect(buildReferralLinks("https://glowupp.co.uk/", "ABC23DEF", "smith-ab12")).toEqual({
      shortLink: "https://glowupp.co.uk/q/ABC23DEF",
      vanLink: "https://glowupp.co.uk/pro/smith-ab12/quote",
    });
  });
  it("treats EXPIRED and past expiresAt as inactive, null expiry as permanent", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    expect(isLockActive({ lockStatus: "ACTIVE", expiresAt: null }, now)).toBe(true);
    expect(isLockActive({ lockStatus: "ACTIVE", expiresAt: new Date("2026-10-05T00:00:00Z") }, now)).toBe(true);
    expect(isLockActive({ lockStatus: "ACTIVE", expiresAt: new Date("2026-10-03T00:00:00Z") }, now)).toBe(false);
    expect(isLockActive({ lockStatus: "EXPIRED", expiresAt: null }, now)).toBe(false);
  });
});
