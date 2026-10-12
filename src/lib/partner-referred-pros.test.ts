import { describe, expect, it } from "vitest";
import { earningUntil, referredProStatus, toReferredProRow, type ReferredProRaw } from "./partner-referred-pros";

const joined = new Date("2026-10-14T10:00:00Z");
const profile = (over: Partial<NonNullable<ReferredProRaw["profile"]>> = {}) => ({
  businessName: "Picasso Painting Ltd",
  shareNameWithPartner: false,
  serviceAreaPrefixes: ["L18", "L25"],
  tradeLabels: ["Painting and decorating"],
  verificationStatus: "UNVERIFIED" as const,
  paidJobs: 0,
  ...over,
});

describe("toReferredProRow", () => {
  it("never shows the business name unless the professional opted in", () => {
    expect(toReferredProRow({ joinedAt: joined, profile: profile() }).name).toBeNull();
    expect(toReferredProRow({ joinedAt: joined, profile: profile({ shareNameWithPartner: true }) }).name).toBe("Picasso Painting Ltd");
  });

  it("shows trade, area and join date without any contact detail", () => {
    const row = toReferredProRow({ joinedAt: joined, profile: profile() });
    expect(row.trades).toEqual(["Painting and decorating"]);
    expect(row.areas).toEqual(["L18", "L25"]);
    expect(row.joinedAt).toEqual(joined);
    expect(Object.keys(row).sort()).toEqual(["areas", "earningNow", "earningUntil", "joinedAt", "name", "paidJobs", "status", "trades"]);
  });

  it("handles someone who has signed up but not finished their profile", () => {
    const row = toReferredProRow({ joinedAt: joined, profile: null });
    expect(row).toMatchObject({ name: null, trades: [], areas: [], paidJobs: 0, status: "Signed up, profile not finished yet" });
  });
});

describe("referredProStatus", () => {
  it("moves from created to verified to won a job", () => {
    expect(referredProStatus(profile())).toBe("Profile created");
    expect(referredProStatus(profile({ verificationStatus: "PENDING" }))).toBe("Profile created");
    expect(referredProStatus(profile({ verificationStatus: "VERIFIED" }))).toBe("Verified");
    expect(referredProStatus(profile({ verificationStatus: "VERIFIED", paidJobs: 2 }))).toBe("Won a job");
  });
});

describe("earning window", () => {
  it("runs 12 months from joining, then stops", () => {
    expect(earningUntil(joined)?.toISOString()).toBe("2027-10-14T10:00:00.000Z");
    expect(toReferredProRow({ joinedAt: joined, profile: profile() }, new Date("2027-10-14T09:59:00Z")).earningNow).toBe(true);
    expect(toReferredProRow({ joinedAt: joined, profile: profile() }, new Date("2027-10-14T10:00:00Z")).earningNow).toBe(false);
  });

  it("has no end when the window is unlimited", () => {
    expect(earningUntil(joined, null)).toBeNull();
  });
});
