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

describe("calculateLeadFee (every job: flat 2%, capped at £250)", () => {
  it("computes exactly 2% of a quote under the cap", () => {
    expect(LEAD_FEE_RATE).toBe(0.02);
    expect(calculateLeadFee(245000)).toBe(4900); // £2,450 quote -> £49
    expect(calculateLeadFee(420000)).toBe(8400); // £4,200 quote -> £84
  });

  it("rounds to the nearest penny for an amount that doesn't divide evenly", () => {
    expect(calculateLeadFee(100001)).toBe(2000); // 2000.02 -> 2000
    expect(calculateLeadFee(99999)).toBe(2000); // 1999.98 -> 2000
  });

  it("caps the fee at £250 from a £12,500 quote upwards", () => {
    expect(LEAD_FEE_CAP_PENCE).toBe(25000);
    expect(calculateLeadFee(1250000)).toBe(25000); // exactly at the cap
    expect(calculateLeadFee(2000000)).toBe(25000); // £20,000 quote would be £400 uncapped
  });

  it("returns zero for a zero quote", () => {
    expect(calculateLeadFee(0)).toBe(0);
  });
});

describe("calculatePrivateLinkFee (own-client jobs: first 3 free, then the same flat 2%)", () => {
  it("is free for a professional's first three private-link jobs", () => {
    expect(PRIVATE_LINK_FREE_JOBS).toBe(3);
    expect(calculatePrivateLinkFee(245000, 0)).toBe(0);
    expect(calculatePrivateLinkFee(245000, 1)).toBe(0);
    expect(calculatePrivateLinkFee(245000, 2)).toBe(0);
  });

  it("charges 2% from the fourth job", () => {
    expect(PRIVATE_LINK_FEE_RATE).toBe(0.02);
    expect(calculatePrivateLinkFee(245000, 3)).toBe(4900); // £2,450 -> £49
    expect(calculatePrivateLinkFee(1000000, 10)).toBe(20000); // £10,000 -> £200
  });

  it("applies the same £250 cap", () => {
    expect(calculatePrivateLinkFee(1250000, 3)).toBe(25000); // £12,500 -> £250 exactly
    expect(calculatePrivateLinkFee(9000000, 3)).toBe(25000); // £90,000 -> still £250
  });

  it("waives a fee too small for Stripe to collect (under 30p)", () => {
    expect(calculatePrivateLinkFee(1000, 3)).toBe(0); // £10 -> 20p
    expect(calculatePrivateLinkFee(1500, 3)).toBe(30); // £15 -> 30p, the minimum
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

  it("waives the fee on an early sign-up's first two marketplace jobs, then charges it", () => {
    expect(calculateMarketplaceFee(420000, 0, early)).toBe(0);
    expect(calculateMarketplaceFee(420000, 1, early)).toBe(0);
    expect(calculateMarketplaceFee(420000, 2, early)).toBe(8400); // third job: £4,200 -> £84
  });

  it("gives nothing to someone who signed up on or after the cutoff", () => {
    expect(calculateMarketplaceFee(420000, 0, late)).toBe(8400);
  });
});
