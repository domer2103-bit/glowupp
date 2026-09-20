/**
 * Professional matching service (Phase 7 of the brief). Deliberately
 * simple and rule-based, not an ML/AI ranking system, per the brief's
 * explicit instruction. Every rule is a small pure function so the set of
 * rules can grow later without restructuring anything that calls
 * `evaluateMatch`/`matchProfessionals` — that's the "keep matching
 * modular" requirement.
 *
 * No "server-only" import here on purpose: these functions take plain
 * data in and return plain data out, with no database or auth access, so
 * they're trivially unit-testable and reusable from anywhere (the current
 * caller is src/lib/data/matching.ts, which does own the database access
 * and the ownership check).
 */

import { getOutwardCode, postcodeMatchesPrefix } from "@/lib/postcode";
import { VerificationStatus } from "@/generated/prisma/client";

export interface MatchProject {
  projectType: string;
  postcode: string;
  /** Not currently used to filter — professionals don't yet declare a budget range. Threaded through for forward-compatibility (see docs/BACKEND_ARCHITECTURE.md §19). */
  budgetMin: number | null;
  budgetMax: number | null;
  /** Not currently used to filter — no professional-side calendar exists yet. Same reasoning as budget. */
  targetStartDate: Date | null;
}

export interface MatchProfessional {
  id: string;
  businessName: string;
  postcode: string;
  serviceAreaPrefixes: string[];
  verificationStatus: VerificationStatus;
  isAvailable: boolean;
  services: readonly { projectType: string }[];
}

export interface MatchRuleResult {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface MatchResult {
  professional: MatchProfessional;
  isMatch: boolean;
  rules: MatchRuleResult[];
}

function checkServiceCategory(project: MatchProject, pro: MatchProfessional): MatchRuleResult {
  const offers = pro.services.some((s) => s.projectType === project.projectType);
  return {
    rule: "service_category",
    passed: offers,
    detail: offers
      ? `Offers "${project.projectType}"`
      : `Does not offer "${project.projectType}" (offers: ${pro.services.map((s) => s.projectType).join(", ") || "nothing yet"})`,
  };
}

function checkServiceArea(project: MatchProject, pro: MatchProfessional): MatchRuleResult {
  const projectOutward = getOutwardCode(project.postcode);
  const matchedPrefix = pro.serviceAreaPrefixes.find((prefix) => postcodeMatchesPrefix(project.postcode, prefix));
  return {
    rule: "service_area",
    passed: Boolean(matchedPrefix),
    detail: matchedPrefix
      ? `${projectOutward} is within declared service area "${matchedPrefix}"`
      : `${projectOutward} is outside declared service area (${pro.serviceAreaPrefixes.join(", ") || "none set"})`,
  };
}

function checkNotRejected(pro: MatchProfessional): MatchRuleResult {
  const passed = pro.verificationStatus !== VerificationStatus.REJECTED;
  return {
    rule: "verification_status",
    passed,
    // Deliberately not requiring VERIFIED: there's no admin verification
    // flow yet (that lands with Phase 12/admin tooling), so gating on it
    // would make matching non-functional for every professional. REJECTED
    // is excluded because that's an explicit negative signal, not just an
    // absent positive one. Verification status is still surfaced here for
    // transparency and used as a sort tiebreaker, not a hard filter.
    detail: passed ? `Verification status: ${pro.verificationStatus}` : "Verification was rejected",
  };
}

function checkAvailable(pro: MatchProfessional): MatchRuleResult {
  return {
    rule: "availability",
    passed: pro.isAvailable,
    detail: pro.isAvailable ? "Currently available" : "Marked unavailable",
  };
}

export function evaluateMatch(project: MatchProject, pro: MatchProfessional): MatchResult {
  const rules = [checkServiceCategory(project, pro), checkServiceArea(project, pro), checkNotRejected(pro), checkAvailable(pro)];
  return { professional: pro, isMatch: rules.every((r) => r.passed), rules };
}

/** Evaluates every professional and returns only the matches, verified professionals first (a soft preference, not a filter — see checkNotRejected). */
export function matchProfessionals(project: MatchProject, professionals: MatchProfessional[]): MatchResult[] {
  return professionals
    .map((pro) => evaluateMatch(project, pro))
    .filter((result) => result.isMatch)
    .sort((a, b) => {
      const aVerified = a.professional.verificationStatus === VerificationStatus.VERIFIED ? 0 : 1;
      const bVerified = b.professional.verificationStatus === VerificationStatus.VERIFIED ? 0 : 1;
      return aVerified - bVerified;
    });
}
