import { describe, expect, it } from "vitest";
import { earningUntil, numberReferredPros, referredProStatus, toReferredProRow, type ReferredProRaw } from "./partner-referred-pros";

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

describe("numberReferredPros", () => {
  const at = (iso: string) => ({ joinedAt: new Date(iso) });

  it("numbers sign-ups by when they joined, earliest first, and keeps the rows in the order they were given", () => {
    const rows = [at("2026-10-20T10:00:00Z"), at("2026-10-14T10:00:00Z"), at("2026-10-17T10:00:00Z")];
    const numbered = numberReferredPros(rows);
    expect(numbered.map((r) => r.signUpNumber)).toEqual([3, 1, 2]);
    expect(numbered.map((r) => r.joinedAt.toISOString())).toEqual(rows.map((r) => r.joinedAt.toISOString()));
  });

  it("does not renumber anyone when somebody joins later", () => {
    const first = numberReferredPros([at("2026-10-14T10:00:00Z"), at("2026-10-17T10:00:00Z")]);
    const later = numberReferredPros([at("2026-10-14T10:00:00Z"), at("2026-10-17T10:00:00Z"), at("2026-11-02T10:00:00Z")]);
    expect(later.slice(0, 2).map((r) => r.signUpNumber)).toEqual(first.map((r) => r.signUpNumber));
    expect(later[2].signUpNumber).toBe(3);
  });

  it("gives two people who joined at the same moment different numbers, in a stable order", () => {
    const numbered = numberReferredPros([at("2026-10-14T10:00:00Z"), at("2026-10-14T10:00:00Z")]);
    expect(numbered.map((r) => r.signUpNumber)).toEqual([1, 2]);
  });

  it("does not depend on whether the person shared their name, and adds nothing but the number", () => {
    const rows = [toReferredProRow({ joinedAt: joined, profile: profile({ shareNameWithPartner: true }) }), toReferredProRow({ joinedAt: new Date("2026-10-15T10:00:00Z"), profile: null })];
    const numbered = numberReferredPros(rows);
    expect(numbered.map((r) => r.signUpNumber)).toEqual([1, 2]);
    expect(Object.keys(numbered[1]).sort()).toEqual(["areas", "earningNow", "earningUntil", "joinedAt", "name", "paidJobs", "signUpNumber", "status", "trades"]);
    expect(numbered[1].name).toBeNull();
  });

  it("handles nobody", () => {
    expect(numberReferredPros([])).toEqual([]);
  });
});
