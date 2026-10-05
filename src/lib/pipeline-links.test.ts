import { describe, expect, it } from "vitest";
import { privateLeadAnchorId, privateLeadHref } from "./pipeline-links";

describe("privateLeadHref", () => {
  it("opens the Private leads tab scrolled to the client's card", () => {
    expect(privateLeadHref("abc-123")).toBe("/professional/pipeline?tab=leads#lead-abc-123");
  });

  it("falls back to the tab alone when the session is unknown", () => {
    expect(privateLeadHref(null)).toBe("/professional/pipeline?tab=leads");
    expect(privateLeadHref(undefined)).toBe("/professional/pipeline?tab=leads");
  });

  it("uses the same id the lead card carries", () => {
    expect(privateLeadHref("s1").endsWith(`#${privateLeadAnchorId("s1")}`)).toBe(true);
  });
});
