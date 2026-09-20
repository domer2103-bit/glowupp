import { describe, it, expect } from "vitest";
import { calculateLeadFee, LEAD_FEE_RATE } from "./fees";

describe("calculateLeadFee", () => {
  it("computes exactly 5% of a round quote amount", () => {
    expect(LEAD_FEE_RATE).toBe(0.05);
    expect(calculateLeadFee(2000000)).toBe(100000); // £20,000 quote -> £1,000 fee
  });

  it("rounds to the nearest penny for an amount that doesn't divide evenly", () => {
    expect(calculateLeadFee(1000001)).toBe(50000); // 50000.05 -> 50000
    expect(calculateLeadFee(999999)).toBe(50000); // 49999.95 -> 50000
  });

  it("returns zero for a zero quote", () => {
    expect(calculateLeadFee(0)).toBe(0);
  });
});
