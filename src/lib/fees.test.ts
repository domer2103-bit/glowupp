import { describe, it, expect } from "vitest";
import {
  calculateLeadFee,
  calculateMarketplaceFee,
  calculatePrivateLinkFee,
  EARLY_BIRD_CUTOFF,
  EARLY_BIRD_FREE_JOBS,
  isEarlyBird,
  LEAD_FEE_CAP_PENCE,
  LEAD_FEE_RATE,
  PRIVATE_LINK_FEE_RATE,
  PRIVATE_LINK_FREE_JOBS,
} from "./fees";

describe("calculateLeadFee (marketplace: 5%, capped at £250)", () => {
  it("computes exactly 5% of a quote under the cap", () => {
    expect(LEAD_FEE_RATE).toBe(0.05);
    expect(calculateLeadFee(245000)).toBe(12250); // £2,450 quote -> £122.50
    expect(calculateLeadFee(420000)).toBe(21000); // £4,200 quote -> £210
  });

  it("rounds to the nearest penny for an amount that doesn't divide evenly", () => {
    expect(calculateLeadFee(100001)).toBe(5000); // 5000.05 -> 5000
    expect(calculateLeadFee(99999)).toBe(5000); // 4999.95 -> 5000
  });

  it("caps the fee at £250 from a £5,000 quote upwards", () => {
    expect(LEAD_FEE_CAP_PENCE).toBe(25000);
    expect(calculateLeadFee(500000)).toBe(25000); // exactly at the cap
    expect(calculateLeadFee(2000000)).toBe(25000); // £20,000 quote would be £1,000 uncapped
  });

  it("returns zero for a zero quote", () => {
    expect(calculateLeadFee(0)).toBe(0);
  });
});

describe("calculatePrivateLinkFee (own-client jobs: first 3 free, then 1%)", () => {
  it("is free for a professional's first three private-link jobs", () => {
    expect(PRIVATE_LINK_FREE_JOBS).toBe(3);
    expect(calculatePrivateLinkFee(245000, 0)).toBe(0);
    expect(calculatePrivateLinkFee(245000, 1)).toBe(0);
    expect(calculatePrivateLinkFee(245000, 2)).toBe(0);
  });

  it("charges 1% from the fourth job", () => {
    expect(PRIVATE_LINK_FEE_RATE).toBe(0.01);
    expect(calculatePrivateLinkFee(245000, 3)).toBe(2450); // £2,450 -> £24.50
    expect(calculatePrivateLinkFee(1000000, 10)).toBe(10000); // £10,000 -> £100
  });

  it("applies the same £250 cap", () => {
    expect(calculatePrivateLinkFee(2500000, 3)).toBe(25000); // £25,000 -> £250 exactly
    expect(calculatePrivateLinkFee(9000000, 3)).toBe(25000); // £90,000 -> still £250
  });

  it("waives a fee too small for Stripe to collect (under 30p)", () => {
    expect(calculatePrivateLinkFee(2500, 3)).toBe(0); // £25 -> 25p
    expect(calculatePrivateLinkFee(3000, 3)).toBe(30); // £30 -> 30p, the minimum
  });
});

describe("early-bird offer (sign up before Black Friday 2026: first 2 marketplace jobs commission-free)", () => {
  const early = new Date("2026-10-08T12:00:00Z");
  const late = new Date("2026-12-01T09:00:00Z");

  it("treats Black Friday 2026 (Fri 27 Nov, 00:00 UK) as the cutoff", () => {
    expect(EARLY_BIRD_CUTOFF.toISOString()).toBe("2026-11-27T00:00:00.000Z");
    expect(EARLY_BIRD_FREE_JOBS).toBe(2);
    expect(isEarlyBird(new Date("2026-11-26T23:59:59Z"))).toBe(true); // Thursday night: still early
    expect(isEarlyBird(new Date("2026-11-27T00:00:00Z"))).toBe(false); // Black Friday itself: too late
  });

  it("waives the 5% on an early sign-up's first two marketplace jobs, then charges it", () => {
    expect(calculateMarketplaceFee(420000, 0, early)).toBe(0);
    expect(calculateMarketplaceFee(420000, 1, early)).toBe(0);
    expect(calculateMarketplaceFee(420000, 2, early)).toBe(21000); // third job: £4,200 -> £210
  });

  it("gives nothing to someone who signed up on or after the cutoff", () => {
    expect(calculateMarketplaceFee(420000, 0, late)).toBe(21000);
  });
});
