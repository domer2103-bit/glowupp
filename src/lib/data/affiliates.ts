import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { AffiliateStatus, TransactionStatus, UserRole } from "@/generated/prisma/client";
import type { AffiliateCategory, Prisma } from "@/generated/prisma/client";
import { AFFILIATE_COOKIE } from "@/lib/affiliate-cookie";
import { cache } from "react";
import { affiliateBalancePence, calculateAffiliateShare, classifyAffiliateCode, generateAffiliateIdentifiers } from "@/lib/affiliate";
import { PARTNER_COOKIE, generateLoginToken, hashLoginToken, isPlausibleLoginToken, loginTokenExpiry } from "@/lib/partner-session";

/**
 * Database side of the B2B Affiliate & Partner Program. Pure maths and
 * link helpers live in src/lib/affiliate.ts.
 *
 * The attribution chain, and why it is built this way:
 *   1. /a/[code] sets an httpOnly cookie (first partner wins for 30 days).
 *   2. When the wizard creates/resolves the homeowner's project, the partner
 *      is STAMPED onto Project.affiliatePartnerId (stampProjectWithAffiliate).
 *   3. When the lead fee is PAID, the partner's share is credited from that
 *      stamp (creditAffiliateForTransaction). The fee is paid by a
 *      professional, usually via a Stripe webhook, so there is no homeowner
 *      cookie to read at that moment — only what we stamped earlier.
 */

type PartnerLookup = { id: string; status: AffiliateStatus; qrSlug: string };

/** An ACTIVE partner by slug or 8-char referral code, or null (unknown, malformed, or suspended). */
export async function findActiveAffiliate(input: string | null | undefined): Promise<PartnerLookup | null> {
  const parsed = classifyAffiliateCode(input);
  if (!parsed) return null;
  const partner = await prisma.affiliatePartner.findUnique({
    where: parsed.kind === "slug" ? { qrSlug: parsed.value } : { referralCode: parsed.value },
    select: { id: true, status: true, qrSlug: true },
  });
  return partner && partner.status === AffiliateStatus.ACTIVE ? partner : null;
}

/** Raw hit counter for the admin table. Fire-and-forget safe: a failure here must never block the visitor's redirect. */
export async function recordAffiliateClick(partnerId: string): Promise<void> {
  try {
    await prisma.affiliatePartner.update({ where: { id: partnerId }, data: { clickCount: { increment: 1 } } });
  } catch (err) {
    console.error("[affiliate] click count failed:", err);
  }
}

/**
 * The raw partner code in the visitor's cookie. Kept separate from the
 * lookup for the same reason as getReferralCodeFromCookie in
 * private-pipeline.ts: `cookies()` marks a page dynamic by throwing, so it
 * must not sit inside a try/catch that guards the database lookup.
 */
export async function getAffiliateCodeFromCookie(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(AFFILIATE_COOKIE)?.value;
}

/**
 * Called whenever the wizard resolves a project for a visitor. If they
 * arrived through a partner's link and the project has no partner yet,
 * stamp it. First touch wins: a project already credited to one partner is
 * never re-pointed at another. Fails soft — losing an attribution must
 * never break the redesign wizard.
 */
export async function stampProjectWithAffiliate(projectId: string, homeownerId: string): Promise<void> {
  const code = await getAffiliateCodeFromCookie();
  if (!code) return;
  try {
    const partner = await findActiveAffiliate(code);
    if (!partner) return;
    const { count } = await prisma.project.updateMany({
      where: { id: projectId, homeownerId, affiliatePartnerId: null },
      data: { affiliatePartnerId: partner.id },
    });
    if (count === 1) {
      await prisma.activityLog.create({
        data: { type: "affiliate_attributed", actorId: homeownerId, projectId, metadata: { partnerId: partner.id } },
      });
    }
  } catch (err) {
    console.error("[affiliate] attribution failed:", err);
  }
}

/**
 * Credits the partner their share once a project's lead fee is PAID. Safe
 * to call any number of times for the same transaction (Stripe redelivers
 * webhooks; an admin can re-mark a fee): the project's payout column is
 * claimed with a compare-and-set, so the money moves exactly once.
 * Returns the pence credited, or null if nothing was (no partner, partner
 * suspended, fee not PAID, or already credited).
 */
export async function creditAffiliateForTransaction(transactionId: string): Promise<number | null> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: {
      status: true,
      feeAmount: true,
      projectId: true,
      project: {
        select: {
          affiliatePartnerId: true,
          affiliatePayoutAmount: true,
          affiliatePartner: { select: { status: true, revenueShareRate: true } },
        },
      },
    },
  });
  if (!transaction || transaction.status !== TransactionStatus.PAID) return null;

  const { affiliatePartnerId, affiliatePayoutAmount, affiliatePartner } = transaction.project;
  if (!affiliatePartnerId || !affiliatePartner || affiliatePartner.status !== AffiliateStatus.ACTIVE) return null;
  if (affiliatePayoutAmount !== null) return null;

  const share = calculateAffiliateShare(transaction.feeAmount, affiliatePartner.revenueShareRate.toNumber());

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.project.updateMany({
      where: { id: transaction.projectId, affiliatePartnerId, affiliatePayoutAmount: null },
      data: { affiliatePayoutAmount: share },
    });
    if (claimed.count === 0) return null; // a concurrent delivery got there first
    if (share > 0) {
      await tx.affiliatePartner.update({ where: { id: affiliatePartnerId }, data: { totalEarningsPence: { increment: share } } });
    }
    await tx.activityLog.create({
      data: {
        type: "affiliate_earning_credited",
        projectId: transaction.projectId,
        metadata: { transactionId, partnerId: affiliatePartnerId, feeAmount: transaction.feeAmount, sharePence: share },
      },
    });
    return share;
  });
}

/**
 * The opposite: a fee that was PAID has been moved back (cancelled, set to
 * pending…) by an admin, so the partner's earning on it is withdrawn. If
 * they were already paid out, their balance goes negative — visible in the
 * admin table as an amount to settle by hand; money is never clawed back
 * automatically. Idempotent, like the credit.
 */
export async function reverseAffiliateForTransaction(transactionId: string): Promise<number | null> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { status: true, projectId: true, project: { select: { affiliatePartnerId: true, affiliatePayoutAmount: true } } },
  });
  if (!transaction || transaction.status === TransactionStatus.PAID) return null;

  const { affiliatePartnerId, affiliatePayoutAmount } = transaction.project;
  if (!affiliatePartnerId || affiliatePayoutAmount === null) return null;

  return prisma.$transaction(async (tx) => {
    const released = await tx.project.updateMany({
      where: { id: transaction.projectId, affiliatePartnerId, affiliatePayoutAmount },
      data: { affiliatePayoutAmount: null },
    });
    if (released.count === 0) return null;
    if (affiliatePayoutAmount > 0) {
      await tx.affiliatePartner.update({ where: { id: affiliatePartnerId }, data: { totalEarningsPence: { decrement: affiliatePayoutAmount } } });
    }
    await tx.activityLog.create({
      data: {
        type: "affiliate_earning_reversed",
        projectId: transaction.projectId,
        metadata: { transactionId, partnerId: affiliatePartnerId, sharePence: affiliatePayoutAmount },
      },
    });
    return affiliatePayoutAmount;
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type AffiliateRow = {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string | null;
  category: AffiliateCategory;
  status: AffiliateStatus;
  /** Signed itself up at /partner/join (as opposed to being created by an admin) — vet before paying. */
  selfRegistered: boolean;
  qrSlug: string;
  revenueShareRate: number;
  clickCount: number;
  /** Homeowner projects started through this partner. */
  projects: number;
  /** Projects where the homeowner picked a professional — the real "conversion". */
  conversions: number;
  /** Total value of the accepted quotes on those jobs (pence). */
  gmvPence: number;
  /** Lead fees GlowUpp has actually collected (PAID) on those jobs (pence). */
  glowuppProfitPence: number;
  totalEarningsPence: number;
  paidEarningsPence: number;
  /** Still owed to the partner. Negative = a reversal after they were paid. */
  balancePence: number;
};

const PROJECT_STATS_SELECT = {
  affiliatePartnerId: true,
  quoteRequests: {
    where: { selected: true },
    select: { quoteAmount: true, transaction: { select: { status: true, feeAmount: true } } },
  },
} satisfies Prisma.ProjectSelect;

/** Funnel and money totals per partner, no authorisation — callers (admin overview, a partner's own dashboard) decide who may see what. Aggregated in code: partner programs are tens of rows, not millions. */
async function computeAffiliateRows(onlyPartnerId?: string): Promise<AffiliateRow[]> {
  const [partners, projects] = await Promise.all([
    prisma.affiliatePartner.findMany({ where: onlyPartnerId ? { id: onlyPartnerId } : undefined, orderBy: { createdAt: "desc" } }),
    prisma.project.findMany({
      where: onlyPartnerId ? { affiliatePartnerId: onlyPartnerId } : { affiliatePartnerId: { not: null } },
      select: PROJECT_STATS_SELECT,
    }),
  ]);

  const stats = new Map<string, { projects: number; conversions: number; gmv: number; profit: number }>();
  for (const project of projects) {
    const key = project.affiliatePartnerId!;
    const s = stats.get(key) ?? { projects: 0, conversions: 0, gmv: 0, profit: 0 };
    s.projects += 1;
    for (const qr of project.quoteRequests) {
      s.conversions += 1;
      s.gmv += qr.quoteAmount ?? 0;
      if (qr.transaction?.status === TransactionStatus.PAID) s.profit += qr.transaction.feeAmount;
    }
    stats.set(key, s);
  }

  return partners.map((p) => {
    const s = stats.get(p.id) ?? { projects: 0, conversions: 0, gmv: 0, profit: 0 };
    return {
      id: p.id,
      businessName: p.businessName,
      contactName: p.contactName,
      email: p.email,
      phone: p.phone,
      category: p.category,
      status: p.status,
      selfRegistered: p.selfRegistered,
      qrSlug: p.qrSlug,
      revenueShareRate: p.revenueShareRate.toNumber(),
      clickCount: p.clickCount,
      projects: s.projects,
      conversions: s.conversions,
      gmvPence: s.gmv,
      glowuppProfitPence: s.profit,
      totalEarningsPence: p.totalEarningsPence,
      paidEarningsPence: p.paidEarningsPence,
      balancePence: affiliateBalancePence(p),
    };
  });
}

/** Every partner with their funnel and money totals — admin only. */
export async function getAffiliateOverview(): Promise<AffiliateRow[]> {
  await requireRole(UserRole.ADMIN);
  return computeAffiliateRows();
}

/** One partner plus their payout history — admin only. */
export async function getAffiliatePartner(id: string) {
  await requireRole(UserRole.ADMIN);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [partner, overview] = await Promise.all([
    prisma.affiliatePartner.findUnique({
      where: { id },
      include: { payouts: { orderBy: { paidAt: "desc" }, include: { paidBy: { select: { name: true } } } } },
    }),
    computeAffiliateRows(id),
  ]);
  if (!partner) return null;
  return { partner, row: overview[0] };
}

export type NewAffiliateInput = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string | null;
  category: AffiliateCategory;
};

/** An account for this email already exists. */
export class AffiliateEmailTakenError extends Error {
  constructor() {
    super("A partner with this email already exists.");
    this.name = "AffiliateEmailTakenError";
  }
}

const isUniqueViolation = (err: unknown) => typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";

async function createPartnerRow(input: NewAffiliateInput, extra: Partial<Prisma.AffiliatePartnerUncheckedCreateInput>) {
  const email = input.email.trim().toLowerCase();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.affiliatePartner.create({ data: { ...input, ...extra, email, ...generateAffiliateIdentifiers(input.businessName) } });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Either the email is taken (not retryable) or a generated code/slug collided (retry with new ones).
      if (await prisma.affiliatePartner.findUnique({ where: { email }, select: { id: true } })) throw new AffiliateEmailTakenError();
      if (attempt === 4) throw err;
    }
  }
  throw new Error("unreachable");
}

/** Admin-created partner with a fresh code/slug; throws AffiliateEmailTakenError for a duplicate email. */
export async function createAffiliatePartner(input: NewAffiliateInput) {
  return createPartnerRow(input, {});
}

/**
 * Public sign-up (/partner/join). Creates an ACTIVE partner at the default
 * 50% share together with a first magic-link token (returned once, never
 * stored). If the email already has an account nothing is created and the
 * caller must NOT sign this visitor in — anyone can type any email into a
 * public form — only email the real owner a fresh link.
 */
export async function registerSelfServePartner(
  input: NewAffiliateInput & { termsAcceptedAt: Date }
): Promise<{ kind: "created"; partner: Awaited<ReturnType<typeof createPartnerRow>>; token: string } | { kind: "exists"; partnerId: string }> {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.affiliatePartner.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { kind: "exists", partnerId: existing.id };

  try {
    const partner = await createPartnerRow(input, { selfRegistered: true });
    const token = await issuePartnerLoginToken(partner.id);
    return { kind: "created", partner, token };
  } catch (err) {
    if (err instanceof AffiliateEmailTakenError) {
      // Two sign-ups for the same email raced; the other one won.
      const winner = await prisma.affiliatePartner.findUniqueOrThrow({ where: { email }, select: { id: true } });
      return { kind: "exists", partnerId: winner.id };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Partner login (magic link) and the partner's own dashboard
// ---------------------------------------------------------------------------

/** How many unexpired sign-in links one partner may hold; issuing more retires the oldest. Bounds the table without ever signing out a recent device. */
const MAX_ACTIVE_LOGIN_TOKENS = 10;

/**
 * Issues a new sign-in token for a partner and returns it — the only time it
 * exists in the clear. Earlier tokens stay valid (see AffiliateLoginToken for
 * why); expired ones and anything beyond the newest MAX_ACTIVE_LOGIN_TOKENS
 * are cleaned out here.
 */
export async function issuePartnerLoginToken(partnerId: string): Promise<string> {
  const token = generateLoginToken();
  await prisma.$transaction(async (tx) => {
    await tx.affiliateLoginToken.create({ data: { partnerId, tokenHash: hashLoginToken(token), expiresAt: loginTokenExpiry() } });
    const keep = await tx.affiliateLoginToken.findMany({
      where: { partnerId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: MAX_ACTIVE_LOGIN_TOKENS,
      select: { id: true },
    });
    await tx.affiliateLoginToken.deleteMany({ where: { partnerId, id: { notIn: keep.map((k) => k.id) } } });
  });
  return token;
}

/** Retires one sign-in token (sign-out on this device). Unknown tokens are ignored. */
export async function revokePartnerLoginToken(token: string | null | undefined): Promise<void> {
  if (!isPlausibleLoginToken(token)) return;
  await prisma.affiliateLoginToken.deleteMany({ where: { tokenHash: hashLoginToken(token) } });
}

export async function findPartnerByEmail(email: string) {
  return prisma.affiliatePartner.findUnique({ where: { email: email.trim().toLowerCase() } });
}

/** The partner a magic-link/session token belongs to, or null if it is malformed, unknown or expired. */
export async function findPartnerByLoginToken(token: string | null | undefined) {
  if (!isPlausibleLoginToken(token)) return null;
  const row = await prisma.affiliateLoginToken.findUnique({ where: { tokenHash: hashLoginToken(token) }, include: { partner: true } });
  if (!row || row.expiresAt.getTime() <= Date.now()) return null;
  return row.partner;
}

/** The signed-in partner for this request (httpOnly cookie), memoised per request. Reading the cookie marks the page dynamic, as it should be. */
export const getCurrentPartner = cache(async () => {
  const jar = await cookies();
  const token = jar.get(PARTNER_COOKIE)?.value;
  return findPartnerByLoginToken(token);
});

export type PartnerDashboard = {
  businessName: string;
  contactName: string;
  status: AffiliateStatus;
  qrSlug: string;
  clickCount: number;
  /** Homeowners who started a redesign through the partner's link. */
  projects: number;
  /** Jobs where the homeowner went on to pick a professional. */
  conversions: number;
  totalEarningsPence: number;
  paidEarningsPence: number;
  balancePence: number;
  revenueSharePercent: number;
  payouts: { id: string; amountPence: number; paidAt: Date }[];
};

/**
 * What a partner may see of their own account: counts and their own money
 * only. Deliberately omits job values and GlowUpp's fee income (business
 * information that is not theirs), and nothing identifying a homeowner or
 * professional is ever loaded.
 */
export async function getPartnerDashboard(partnerId: string): Promise<PartnerDashboard | null> {
  const [row] = await computeAffiliateRows(partnerId);
  if (!row) return null;
  const payouts = await prisma.affiliatePayout.findMany({ where: { partnerId }, orderBy: { paidAt: "desc" }, take: 50, select: { id: true, amountPence: true, paidAt: true } });
  return {
    businessName: row.businessName,
    contactName: row.contactName,
    status: row.status,
    qrSlug: row.qrSlug,
    clickCount: row.clickCount,
    projects: row.projects,
    conversions: row.conversions,
    totalEarningsPence: row.totalEarningsPence,
    paidEarningsPence: row.paidEarningsPence,
    balancePence: row.balancePence,
    revenueSharePercent: Math.round(row.revenueShareRate * 100),
    payouts,
  };
}

/**
 * Logs a payout of exactly `expectedPence` (what the admin saw on screen)
 * and moves it from owed to paid. Refuses — returning false — if the
 * balance changed in the meantime, so a stale page can never pay the wrong
 * amount or pay twice (the paid counter is compare-and-set).
 */
export async function recordAffiliatePayout(partnerId: string, expectedPence: number, adminId: string, note: string | null): Promise<boolean> {
  if (!Number.isInteger(expectedPence) || expectedPence <= 0) return false;
  return prisma.$transaction(async (tx) => {
    const partner = await tx.affiliatePartner.findUnique({ where: { id: partnerId } });
    if (!partner || affiliateBalancePence(partner) !== expectedPence) return false;
    const claimed = await tx.affiliatePartner.updateMany({
      where: { id: partnerId, paidEarningsPence: partner.paidEarningsPence, totalEarningsPence: partner.totalEarningsPence },
      data: { paidEarningsPence: { increment: expectedPence } },
    });
    if (claimed.count === 0) return false;
    await tx.affiliatePayout.create({ data: { partnerId, amountPence: expectedPence, note, paidById: adminId } });
    await tx.activityLog.create({
      data: { type: "affiliate_payout_recorded", actorId: adminId, metadata: { partnerId, amountPence: expectedPence } },
    });
    return true;
  });
}
