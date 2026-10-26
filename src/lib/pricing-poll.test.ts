import { describe, expect, it } from "vitest";
import { PricingVoteSchema, percent, tallyVotes } from "@/lib/pricing-poll";

describe("PricingVoteSchema", () => {
  it("accepts a bare choice", () => {
    expect(PricingVoteSchema.safeParse({ choice: "commission" }).success).toBe(true);
    expect(PricingVoteSchema.safeParse({ choice: "subscription" }).success).toBe(true);
  });

  it("accepts the optional price and trade answers", () => {
    expect(PricingVoteSchema.safeParse({ choice: "subscription", price: "29", trade: "Plumber or heating engineer" }).success).toBe(true);
    expect(PricingVoteSchema.safeParse({ choice: "commission", price: "none" }).success).toBe(true);
  });

  it("rejects anything outside the allowed options", () => {
    expect(PricingVoteSchema.safeParse({ choice: "both" }).success).toBe(false);
    expect(PricingVoteSchema.safeParse({ choice: "commission", price: "5" }).success).toBe(false);
    expect(PricingVoteSchema.safeParse({ choice: "commission", trade: "Astronaut" }).success).toBe(false);
    expect(PricingVoteSchema.safeParse({}).success).toBe(false);
  });
});

describe("tallyVotes", () => {
  it("counts choices, prices and trades, ignoring junk rows", () => {
    const t = tallyVotes([
      { choice: "commission", price: "none", trade: "Builder" },
      { choice: "subscription", price: "29" },
      { choice: "subscription", price: "29", trade: "Builder" },
      { choice: "subscription" },
      { choice: "garbage", price: "19" },
    ]);
    expect(t.total).toBe(4);
    expect(t.commission).toBe(1);
    expect(t.subscription).toBe(3);
    expect(t.byPrice).toEqual({ none: 1, "29": 2 });
    expect(t.byTrade).toEqual({ Builder: 2 });
  });

  it("handles no votes", () => {
    expect(tallyVotes([]).total).toBe(0);
    expect(percent(0, 0)).toBe(0);
  });
});

describe("percent", () => {
  it("rounds to whole percentages", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
    expect(percent(5, 5)).toBe(100);
  });
});
