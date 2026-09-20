import { describe, it, expect } from "vitest";
import { containsLikelyContactInfo } from "./contact-info";

describe("containsLikelyContactInfo", () => {
  it("detects a UK-style phone number", () => {
    expect(containsLikelyContactInfo("call me on 07911 123456")).toBe(true);
    expect(containsLikelyContactInfo("07911123456")).toBe(true);
    expect(containsLikelyContactInfo("+44 7911 123 456")).toBe(true);
  });

  it("detects an email address", () => {
    expect(containsLikelyContactInfo("reach me at john@example.com")).toBe(true);
  });

  it("does not flag ordinary message text", () => {
    expect(containsLikelyContactInfo("Can you include the cost of removing the old units?")).toBe(false);
    expect(containsLikelyContactInfo("Timeline works for us, thanks!")).toBe(false);
  });

  it("does not flag a short number like a budget or quantity", () => {
    expect(containsLikelyContactInfo("We're thinking around 15000 for the whole job")).toBe(false);
    expect(containsLikelyContactInfo("Need 3 radiators replaced")).toBe(false);
  });
});
