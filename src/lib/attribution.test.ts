import { describe, expect, it } from "vitest";
import { attributionLabel, decodeAttribution, encodeAttribution, externalReferrerHost, parseAttribution } from "./attribution";

const url = (s: string) => new URL(s);

describe("parseAttribution", () => {
  it("reads utm tags and the landing path", () => {
    const a = parseAttribution(url("https://glowupp.co.uk/signup?role=professional&utm_source=facebook&utm_medium=social&utm_campaign=trades-explainer"), null);
    expect(a).toEqual({ source: "facebook", medium: "social", campaign: "trades-explainer", refHost: null, landing: "/signup" });
  });

  it("falls back to the external referrer", () => {
    const a = parseAttribution(url("https://glowupp.co.uk/partners"), "https://l.facebook.com/l.php?u=abc");
    expect(a?.refHost).toBe("l.facebook.com");
    expect(a?.source).toBeNull();
    expect(attributionLabel(a)).toBe("l.facebook.com");
  });

  it("ignores direct visits and clicks from our own site", () => {
    expect(parseAttribution(url("https://glowupp.co.uk/"), null)).toBeNull();
    expect(parseAttribution(url("https://glowupp.co.uk/how-it-works"), "https://www.glowupp.co.uk/")).toBeNull();
    expect(attributionLabel(null)).toBe("direct");
  });

  it("reduces hostile or oversized values to short safe tokens", () => {
    const a = parseAttribution(url(`https://glowupp.co.uk/?utm_source=${encodeURIComponent("<script>alert(1)</script> " + "x".repeat(200))}`), null);
    expect(a?.source).toMatch(/^[a-z0-9._-]+$/);
    expect(a?.source?.length).toBeLessThanOrEqual(40);
  });

  it("survives an encode/decode round trip and rejects junk", () => {
    const a = parseAttribution(url("https://glowupp.co.uk/professionals?utm_source=linkedin&utm_campaign=trades-explainer"), null)!;
    expect(decodeAttribution(encodeAttribution(a))).toEqual(a);
    expect(decodeAttribution("")).toBeNull();
    expect(decodeAttribution("nonsense")).toBeNull();
  });

  it("handles a malformed referrer", () => {
    expect(externalReferrerHost("not a url", "glowupp.co.uk")).toBeNull();
  });
});
