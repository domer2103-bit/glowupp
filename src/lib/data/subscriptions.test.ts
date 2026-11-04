import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const findUnique = vi.fn();
const upsert = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { professionalSubscription: { findUnique: (...a: unknown[]) => findUnique(...a), upsert: (...a: unknown[]) => upsert(...a) } } }));

import { syncSubscriptionFromStripe } from "./subscriptions";

const stripeSub = (over: Record<string, unknown> = {}) =>
  ({
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    metadata: { professionalId: "pro-1" },
    items: { data: [{ current_period_end: 1_800_000_000, price: { unit_amount: 2900, recurring: { interval: "month" } } }] },
    ...over,
  }) as never;

beforeEach(() => {
  findUnique.mockReset();
  upsert.mockReset();
  findUnique.mockResolvedValue(null);
});

describe("syncSubscriptionFromStripe", () => {
  it("stores the state Stripe reports, including the locked-in price", async () => {
    const res = await syncSubscriptionFromStripe(stripeSub());
    expect(res).toEqual({ professionalId: "pro-1" });
    const arg = upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ professionalId: "pro-1" });
    expect(arg.create).toMatchObject({ status: "ACTIVE", interval: "MONTH", unitAmountPence: 2900, stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1", cancelAtPeriodEnd: false });
    expect(arg.create.currentPeriodEnd).toEqual(new Date(1_800_000_000 * 1000));
  });
  it("records a yearly plan and a pending cancellation", async () => {
    await syncSubscriptionFromStripe(stripeSub({ cancel_at_period_end: true, items: { data: [{ current_period_end: 1, price: { unit_amount: 29000, recurring: { interval: "year" } } }] } }));
    expect(upsert.mock.calls[0][0].update).toMatchObject({ interval: "YEAR", unitAmountPence: 29000, cancelAtPeriodEnd: true, status: "ACTIVE" });
  });
  it("marks an ended subscription CANCELED", async () => {
    await syncSubscriptionFromStripe(stripeSub({ status: "canceled" }));
    expect(upsert.mock.calls[0][0].update.status).toBe("CANCELED");
  });
  it("finds the professional from the stored row when the event has no metadata", async () => {
    findUnique.mockResolvedValue({ professionalId: "pro-9" });
    const res = await syncSubscriptionFromStripe(stripeSub({ metadata: {} }));
    expect(res).toEqual({ professionalId: "pro-9" });
  });
  it("does nothing for a subscription it cannot match to a professional", async () => {
    const res = await syncSubscriptionFromStripe(stripeSub({ metadata: {} }));
    expect(res).toBeNull();
    expect(upsert).not.toHaveBeenCalled();
  });
  it("accepts an expanded customer object", async () => {
    await syncSubscriptionFromStripe(stripeSub({ customer: { id: "cus_2" } }));
    expect(upsert.mock.calls[0][0].create.stripeCustomerId).toBe("cus_2");
  });
});
