import { PRO_REFERRAL_EARNING_MONTHS } from "@/lib/affiliate";

/**
 * What a partner is allowed to see about the tradespeople who joined through their link.
 * Deliberately limited: trade, area, when they joined, how far they have got, how many paid
 * jobs. The business name appears only if that professional opted in (shareNameWithPartner);
 * contact details, emails and phone numbers are never part of this view (the admin sees those).
 */
export type ReferredProRaw = {
  joinedAt: Date;
  /** null until the professional has created their business profile. */
  profile: null | {
    businessName: string;
    shareNameWithPartner: boolean;
    serviceAreaPrefixes: string[];
    tradeLabels: string[];
    verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
    paidJobs: number;
  };
};

export type ReferredProRow = {
  /** Present only when the professional chose to share it. */
  name: string | null;
  trades: string[];
  areas: string[];
  joinedAt: Date;
  /** Until when jobs they win still earn the partner a share; null = no limit. */
  earningUntil: Date | null;
  earningNow: boolean;
  status: string;
  paidJobs: number;
};

export function earningUntil(joinedAt: Date, months: number | null = PRO_REFERRAL_EARNING_MONTHS): Date | null {
  if (months === null) return null;
  const end = new Date(joinedAt);
  end.setUTCMonth(end.getUTCMonth() + months);
  return end;
}

export function referredProStatus(profile: ReferredProRaw["profile"]): string {
  if (!profile) return "Signed up, profile not finished yet";
  if (profile.paidJobs > 0) return "Won a job";
  if (profile.verificationStatus === "VERIFIED") return "Verified";
  return "Profile created";
}

export function toReferredProRow(raw: ReferredProRaw, now: Date = new Date()): ReferredProRow {
  const until = earningUntil(raw.joinedAt);
  const p = raw.profile;
  return {
    name: p && p.shareNameWithPartner ? p.businessName : null,
    trades: p?.tradeLabels ?? [],
    areas: p?.serviceAreaPrefixes ?? [],
    joinedAt: raw.joinedAt,
    earningUntil: until,
    earningNow: until === null || now.getTime() < until.getTime(),
    status: referredProStatus(p),
    paidJobs: p?.paidJobs ?? 0,
  };
}

/** A row plus its position in join order: "Sign-up 1" is the first tradesperson who joined through this partner's link. */
export type NumberedReferredProRow = ReferredProRow & { signUpNumber: number };

/**
 * Numbers rows by when they joined (earliest = 1) and returns them in the order they were given. The number
 * never depends on whether someone shared their name, and never changes when more people join later, so the
 * partner and the admin can talk about "Sign-up 3" and mean the same person.
 */
export function numberReferredPros<T extends { joinedAt: Date }>(rows: T[]): (T & { signUpNumber: number })[] {
  const order = rows.map((r, i) => ({ i, t: r.joinedAt.getTime() })).sort((a, b) => a.t - b.t || a.i - b.i);
  const numberOf = new Map<number, number>();
  order.forEach((o, rank) => numberOf.set(o.i, rank + 1));
  return rows.map((r, i) => ({ ...r, signUpNumber: numberOf.get(i)! }));
}
