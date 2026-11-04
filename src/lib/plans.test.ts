import { describe, expect, it } from "vitest";
import {
  breakEvenQuotePence,
  intervalFromStripe,
  isProActive,
  mapStripeStatus,
  PRO_LAUNCH_PRICE_PENCE,
  PRO_LIST_PRICE_PENCE,
  yearlySavingPence,
} from "./plans";
import { calculatePrivateLinkFee } from "./fees";

describe("Pro plan prices", () => {
  it("launch prices are below list prices", () => {
    expect(PRO_LAUNCH_PRICE_PENCE.month).toBe(2_900);
    expect(PRO_LIST_PRICE_PENCE.month).toBe(3_900);
    expect(PRO_LAUNCH_PRICE_PENCE.month).toBeLessThan(PRO_LIST_PRICE_PENCE.month);
    expect(PRO_LAUNCH_PRICE_PENCE.year).toBeLessThan(PRO_LIST_PRICE_PENCE.year);
  });
  it("yearly is exactly two months free", () => {
    expect(yearlySavingPence()).toBe(PRO_LAUNCH_PRICE_PENCE.month * 2);
    expect(PRO_LAUNCH_PRICE_PENCE.year).toBe(PRO_LAUNCH_PRICE_PENCE.month * 10);
  });
  it("break-even: 2% of £1,450 of quotes equals the £29 plan", () => {
    expect(breakEvenQuotePence()).toBe(145_000);
  });
});

describe("isProActive", () => {
  it("benefits apply while active or while a failed payment is being retried", () => {
    expect(isProActive({ status: "ACTIVE" })).toBe(true);
    expect(isProActive({ status: "PAST_DUE" })).toBe(true);
  });
  it("benefits stop when the subscription has ended or never started", () => {
    expect(isProActive({ status: "CANCELED" })).toBe(false);
    expect(isProActive({ status: "INACTIVE" })).toBe(false);
    expect(isProActive(null)).toBe(false);
    expect(isProActive(undefined)).toBe(false);
  });
});

describe("mapStripeStatus / intervalFromStripe", () => {
  it("maps Stripe statuses", () => {
    expect(mapStripeStatus("active")).toBe("ACTIVE");
    expect(mapStripeStatus("trialing")).toBe("ACTIVE");
    expect(mapStripeStatus("past_due")).toBe("PAST_DUE");
    expect(mapStripeStatus("unpaid")).toBe("PAST_DUE");
    expect(mapStripeStatus("canceled")).toBe("CANCELED");
    expect(mapStripeStatus("incomplete")).toBe("INACTIVE");
    expect(mapStripeStatus("incomplete_expired")).toBe("INACTIVE");
    expect(mapStripeStatus("paused")).toBe("INACTIVE");
  });
  it("defaults to monthly", () => {
    expect(intervalFromStripe("year")).toBe("YEAR");
    expect(intervalFromStripe("month")).toBe("MONTH");
    expect(intervalFromStripe(undefined)).toBe("MONTH");
  });
});

describe("own-client fee with Pro", () => {
  it("is zero for an active Pro plan whatever the job count or size", () => {
    expect(calculatePrivateLinkFee(1_000_000, 50, true)).toBe(0);
  });
  it("is unchanged without Pro", () => {
    expect(calculatePrivateLinkFee(245_000, 0, false)).toBe(0);
    expect(calculatePrivateLinkFee(245_000, 3, false)).toBe(4_900);
    expect(calculatePrivateLinkFee(245_000, 3)).toBe(4_900);
  });
});
