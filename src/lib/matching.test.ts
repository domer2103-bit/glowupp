import { describe, it, expect } from "vitest";
import { evaluateMatch, matchProfessionals, type MatchProject, type MatchProfessional } from "./matching";
import { VerificationStatus } from "@/generated/prisma/client";

const baseProject: MatchProject = {
  projectType: "kitchen",
  postcode: "L18 5NF",
  budgetMin: null,
  budgetMax: null,
  targetStartDate: null,
};

function makePro(overrides: Partial<MatchProfessional> = {}): MatchProfessional {
  return {
    id: "pro-1",
    businessName: "Test Pro",
    postcode: "L18 2AA",
    serviceAreaPrefixes: ["L18"],
    verificationStatus: VerificationStatus.UNVERIFIED,
    isAvailable: true,
    services: [{ projectType: "kitchen" }],
    ...overrides,
  };
}

function ruleFor(result: ReturnType<typeof evaluateMatch>, rule: string) {
  const found = result.rules.find((r) => r.rule === rule);
  if (!found) throw new Error(`rule "${rule}" not found in result`);
  return found;
}

describe("evaluateMatch — each rule in isolation", () => {
  it("passes every rule for a fully matching professional", () => {
    const result = evaluateMatch(baseProject, makePro());
    expect(result.isMatch).toBe(true);
    expect(result.rules.every((r) => r.passed)).toBe(true);
  });

  it("fails only service_category when the professional doesn't offer this project type", () => {
    const result = evaluateMatch(baseProject, makePro({ services: [{ projectType: "driveway" }] }));
    expect(result.isMatch).toBe(false);
    expect(ruleFor(result, "service_category").passed).toBe(false);
    expect(ruleFor(result, "service_area").passed).toBe(true);
    expect(ruleFor(result, "verification_status").passed).toBe(true);
    expect(ruleFor(result, "availability").passed).toBe(true);
  });

  it("fails only service_area when the project's postcode is outside the declared area", () => {
    const result = evaluateMatch(baseProject, makePro({ serviceAreaPrefixes: ["M"] }));
    expect(result.isMatch).toBe(false);
    expect(ruleFor(result, "service_area").passed).toBe(false);
    expect(ruleFor(result, "service_category").passed).toBe(true);
  });

  it("fails only verification_status when the professional was rejected", () => {
    const result = evaluateMatch(baseProject, makePro({ verificationStatus: VerificationStatus.REJECTED }));
    expect(result.isMatch).toBe(false);
    expect(ruleFor(result, "verification_status").passed).toBe(false);
    expect(ruleFor(result, "service_category").passed).toBe(true);
  });

  it("does NOT require VERIFIED status — UNVERIFIED and PENDING still pass", () => {
    expect(evaluateMatch(baseProject, makePro({ verificationStatus: VerificationStatus.UNVERIFIED })).isMatch).toBe(true);
    expect(evaluateMatch(baseProject, makePro({ verificationStatus: VerificationStatus.PENDING })).isMatch).toBe(true);
  });

  it("fails only availability when the professional is marked unavailable", () => {
    const result = evaluateMatch(baseProject, makePro({ isAvailable: false }));
    expect(result.isMatch).toBe(false);
    expect(ruleFor(result, "availability").passed).toBe(false);
    expect(ruleFor(result, "service_category").passed).toBe(true);
  });

  it("a whole-area prefix (e.g. \"L\") matches any district within it", () => {
    const result = evaluateMatch(baseProject, makePro({ serviceAreaPrefixes: ["L"] }));
    expect(ruleFor(result, "service_area").passed).toBe(true);
  });
});

describe("matchProfessionals", () => {
  it("returns only the professionals that pass every rule", () => {
    const matching = makePro({ id: "match" });
    const notMatching = makePro({ id: "no-match", services: [{ projectType: "driveway" }] });
    const results = matchProfessionals(baseProject, [matching, notMatching]);
    expect(results.map((r) => r.professional.id)).toEqual(["match"]);
  });

  it("sorts verified professionals first, without excluding unverified ones", () => {
    const unverified = makePro({ id: "unverified", verificationStatus: VerificationStatus.UNVERIFIED });
    const verified = makePro({ id: "verified", verificationStatus: VerificationStatus.VERIFIED });
    const results = matchProfessionals(baseProject, [unverified, verified]);
    expect(results.map((r) => r.professional.id)).toEqual(["verified", "unverified"]);
  });

  it("returns an empty array when nobody matches", () => {
    const results = matchProfessionals(baseProject, [makePro({ serviceAreaPrefixes: ["M"] })]);
    expect(results).toEqual([]);
  });
});
