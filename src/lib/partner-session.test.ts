import { describe, expect, it } from "vitest";
import { LOGIN_TOKEN_TTL_DAYS, buildDashboardLink, generateLoginToken, hashLoginToken, isPlausibleLoginToken, loginTokenExpiry } from "./partner-session";

describe("partner magic-link tokens", () => {
  it("mints long random url-safe tokens that never repeat", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateLoginToken()));
    expect(tokens.size).toBe(200);
    for (const t of tokens) {
      expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes of base64url
      expect(isPlausibleLoginToken(t)).toBe(true);
    }
  });

  it("stores only a one-way hash: stable for the same token, different for another, never the token itself", () => {
    const token = generateLoginToken();
    expect(hashLoginToken(token)).toBe(hashLoginToken(token));
    expect(hashLoginToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashLoginToken(token)).not.toContain(token);
    expect(hashLoginToken(token)).not.toBe(hashLoginToken(generateLoginToken()));
  });

  it("rejects obviously malformed tokens before any database lookup", () => {
    for (const bad of [undefined, null, "", "short", "a".repeat(44), `${"a".repeat(42)}!`, "../../etc/passwd", " ".repeat(43)]) {
      expect(isPlausibleLoginToken(bad as string | null | undefined)).toBe(false);
    }
  });

  it("expires after the configured number of days", () => {
    const from = new Date("2026-10-08T12:00:00Z");
    expect(loginTokenExpiry(from).getTime() - from.getTime()).toBe(LOGIN_TOKEN_TTL_DAYS * 86_400_000);
  });

  it("builds the emailed dashboard link", () => {
    expect(buildDashboardLink("https://www.glowupp.co.uk/", "abc")).toBe("https://www.glowupp.co.uk/partner/dashboard?token=abc");
  });
});
