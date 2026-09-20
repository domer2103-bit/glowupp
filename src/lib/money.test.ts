import { describe, it, expect } from "vitest";
import { poundsToPence, penceToPounds, formatPence } from "./money";

describe("poundsToPence", () => {
  it("converts whole pounds", () => {
    expect(poundsToPence(15000)).toBe(1500000);
  });

  it("rounds fractional pence correctly", () => {
    expect(poundsToPence(19.99)).toBe(1999);
    expect(poundsToPence(0.1)).toBe(10);
  });

  it("handles zero", () => {
    expect(poundsToPence(0)).toBe(0);
  });
});

describe("penceToPounds", () => {
  it("is the inverse of poundsToPence for whole-penny amounts", () => {
    expect(penceToPounds(1500000)).toBe(15000);
    expect(penceToPounds(1999)).toBe(19.99);
  });
});

describe("formatPence", () => {
  it("formats as GBP currency with no decimal places", () => {
    expect(formatPence(1500000)).toBe("£15,000");
  });

  it("formats a small amount", () => {
    expect(formatPence(100000)).toBe("£1,000");
  });

  it("rounds to whole pounds for display", () => {
    expect(formatPence(1999)).toBe("£20");
  });
});
