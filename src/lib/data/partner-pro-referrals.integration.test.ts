/**
 * Integration tests for partners earning on professionals they bring (the
 * "tradespeople link"): /a/<slug>/pro, attribution at professional sign-up,
 * and the share credited when one of that professional's fees is paid.
 * Skipped unless PIPELINE_TEST_DB is set (scratch database only, never
 * production); Supabase, email and Stripe are mocked.
 *
 *   PIPELINE_TEST_DB=1 DATABASE_URL=postgres://... pnpm vitest run partner-pro-referrals.integration
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({
  currentUser: null as null | { id: string; role: string },
  jar: new Map<string, string>(),
  ip: "10.0.0.1",
  signUpUserId: "" as string,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (state.jar.has(n) ? { name: n, value: state.jar.get(n)! } : undefined),
    delete: (n: string) => state.jar.delete(n),
  }),
  headers: async () => new Headers({ "x-forwarded-for": state.ip }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: async () => state.currentUser,
  requireUser: async () => {
    if (!state.currentUser) throw new Error("NEXT_REDIRECT:/login");
    return state.currentUser;
  },
  requireRole: async (role: string | string[]) => {
    const roles = Array.isArray(role) ? role : [role];
    if (!state.currentUser || !roles.includes(state.currentUser.role)) throw new Error("NEXT_REDIRECT:/dashboard");
    return state.currentUser;
  },
}));
vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  return { prisma: new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }) }) };
});
// The sign-up action only needs Supabase to say "created, no session yet"; the users row it would create via the database trigger is made by the test.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signUp: async () => ({ data: { user: { id: state.signUpUserId }, session: null }, error: null }) } }),
}));
vi.mock("@/lib/storage", () => ({ getSignedPhotoUrl: async () => "https://signed.test/render.jpg" }));
vi.mock("@/lib/notifications", () => ({
  APP_URL: "https://glowupp.test",
  notifyPartnerNoFeeJob: vi.fn(),
  notifyPartnerWelcome: vi.fn(),
  notifyPartnerLoginLink: vi.fn(),
  notifyLeadFeePaid: vi.fn(),
  notifyPrivateEstimateRequested: vi.fn(),
  notifyPrivateQuoteSubmitted: vi.fn(),
  notifyOpenMarketProject: vi.fn(),
  notifyQuoteSubmitted: vi.fn(),
  notifyProfessionalSelected: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { AFFILIATE_COOKIE } from "@/lib/affiliate-cookie";
import { PARTNER_COOKIE } from "@/lib/partner-session";
import { notifyPartnerNoFeeJob } from "@/lib/notifications";
import { getOrCreateDraftProject } from "@/lib/data/projects";
import { selectProfessional } from "@/lib/actions/quotes";
import { dismissPartnerNotices } from "@/lib/actions/partner";
import { GET as proLink } from "@/app/a/[code]/pro/route";
import { GET as homeLink } from "@/app/a/[code]/route";
import { signup } from "@/lib/actions/auth";
import { releaseSelfReferral } from "@/lib/actions/affiliates";
import PartnerDashboardPage from "@/app/partner/dashboard/page";
import AdminAffiliatesPage from "@/app/admin/affiliates/page";
import AdminAffiliatePartnerPage from "@/app/admin/affiliates/[id]/page";
import {
  createAffiliatePartner,
  creditAffiliateForTransaction,
  getAffiliateOverview,
  getBlockedSelfReferrals,
  getPartnerNotices,
  issuePartnerLoginToken,
  settleFreeJobForAffiliate,
  getPartnerDashboard,
  reverseAffiliateForTransaction,
  stampProfessionalSignupWithAffiliate,
} from "@/lib/data/affiliates";
import { AffiliateSource, AffiliateStatus, ProjectStatus, QuoteRequestStatus, TransactionStatus, UserRole } from "@/generated/prisma/client";

const run = process.env.PIPELINE_TEST_DB ? describe : describe.skip;
const noFeeMail = vi.mocked(notifyPartnerNoFeeJob);
const md = (node: unknown) => renderToStaticMarkup(node as never);

async function makePartner(name = "Trade Cafe") {
  return createAffiliatePartner({ businessName: name, contactName: "Sam", email: `${randomUUID()}@partner.test`, phone: null, category: "TRADE_SUPPLIER" });
}
async function makeUser(role: UserRole, extra: { phone?: string | null; email?: string; createdAt?: Date; affiliatePartnerId?: string | null } = {}) {
  const id = randomUUID();
  return prisma.user.create({
    data: { id, role, name: role, email: extra.email ?? `${id}@t.test`, phone: extra.phone ?? null, createdAt: extra.createdAt, affiliatePartnerId: extra.affiliatePartnerId ?? null },
  });
}
async function makePro(extra: { partnerId?: string | null; phone?: string | null; email?: string; createdAt?: Date } = {}) {
  const user = await makeUser(UserRole.PROFESSIONAL, { phone: extra.phone, email: extra.email, createdAt: extra.createdAt, affiliatePartnerId: extra.partnerId });
  const pro = await prisma.professional.create({ data: { userId: user.id, businessName: "Pro Ltd", postcode: "L1 2AB", serviceAreaPrefixes: ["L"] } });
  return { user, pro };
}
/** One job won by `pro`, with a lead fee of `feePence` in `status`; the homeowner optionally came through `homeownerPartnerId`. */
async function job(pro: { id: string }, opts: { feePence: number; homeownerPartnerId?: string | null; status?: TransactionStatus; quotePence?: number }) {
  const homeowner = await makeUser(UserRole.HOMEOWNER);
  const project = await prisma.project.create({
    data: {
      homeownerId: homeowner.id,
      projectType: "kitchen",
      title: "Kitchen",
      postcode: "L1 2AB",
      affiliatePartnerId: opts.homeownerPartnerId ?? null,
      affiliateSource: opts.homeownerPartnerId ? AffiliateSource.HOMEOWNER : null,
    },
  });
  const quote = await prisma.quoteRequest.create({ data: { projectId: project.id, homeownerId: homeowner.id, professionalId: pro.id, selected: true, quoteAmount: opts.quotePence ?? opts.feePence * 20 } });
  const transaction = await prisma.transaction.create({ data: { quoteRequestId: quote.id, professionalId: pro.id, projectId: project.id, feeAmount: opts.feePence, status: opts.status ?? TransactionStatus.PAID } });
  return { project, transaction };
}
const partnerNow = (id: string) => prisma.affiliatePartner.findUniqueOrThrow({ where: { id } });
const projectNow = (id: string) => prisma.project.findUniqueOrThrow({ where: { id } });
const visit = (handler: typeof proLink, code: string) => handler(new NextRequest(`https://glowupp.test/a/${code}/pro`), { params: Promise.resolve({ code }) } as never);
const pageProps = (searchParams: Record<string, string> = {}) => ({ searchParams: Promise.resolve(searchParams) }) as never;

run("Partner credit for professionals they bring", () => {
  beforeEach(() => {
    state.currentUser = null;
    state.jar.clear();
    state.ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    noFeeMail.mockClear();
  });

  describe("/a/<slug>/pro", () => {
    it("remembers the partner, counts the visit and opens the professional sign-up, tagged for analytics", async () => {
      const partner = await makePartner();
      const res = await visit(proLink, partner.qrSlug);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`/signup?role=professional&utm_source=affiliate&utm_medium=qr&utm_campaign=${partner.qrSlug}-pro`);
      expect(res.cookies.get(AFFILIATE_COOKIE)?.value).toBe(partner.qrSlug);
      expect((await partnerNow(partner.id)).clickCount).toBe(1);

      const byCode = await visit(proLink, partner.referralCode.toLowerCase()); // the 8-character code works too
      expect(byCode.headers.get("location")).toContain("/signup?role=professional");
      expect((await partnerNow(partner.id)).clickCount).toBe(2);
    });

    it("an unknown or suspended code still lands on the professional sign-up, with no cookie", async () => {
      const suspended = await makePartner("Paused");
      await prisma.affiliatePartner.update({ where: { id: suspended.id }, data: { status: AffiliateStatus.SUSPENDED } });
      for (const code of ["nope-zzzz", "ZZZZZZZZ", suspended.qrSlug]) {
        const res = await visit(proLink, code);
        expect(res.headers.get("location")).toBe("/signup?role=professional");
        expect(res.cookies.get(AFFILIATE_COOKIE)).toBeUndefined();
      }
    });

    it("the homeowner link still goes to the category chooser (the two routes share one implementation)", async () => {
      const partner = await makePartner();
      const res = await homeLink(new NextRequest(`https://glowupp.test/a/${partner.qrSlug}`), { params: Promise.resolve({ code: partner.qrSlug }) } as never);
      expect(res.headers.get("location")).toBe(`/?utm_source=affiliate&utm_medium=qr&utm_campaign=${partner.qrSlug}#categories`);
    });
  });

  describe("attribution at professional sign-up", () => {
    it("tags a new professional with the partner from the cookie, and logs it", async () => {
      const partner = await makePartner();
      const user = await makeUser(UserRole.PROFESSIONAL);
      state.jar.set(AFFILIATE_COOKIE, partner.qrSlug);
      await stampProfessionalSignupWithAffiliate(user.id);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).affiliatePartnerId).toBe(partner.id);
      expect(await prisma.activityLog.count({ where: { type: "affiliate_professional_attributed", actorId: user.id } })).toBe(1);
    });

    it("tags nobody who is not a professional, and nobody without a valid, active partner cookie", async () => {
      const partner = await makePartner();
      const homeowner = await makeUser(UserRole.HOMEOWNER);
      state.jar.set(AFFILIATE_COOKIE, partner.qrSlug);
      await stampProfessionalSignupWithAffiliate(homeowner.id);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: homeowner.id } })).affiliatePartnerId).toBeNull();

      const pro = await makeUser(UserRole.PROFESSIONAL);
      state.jar.clear();
      await stampProfessionalSignupWithAffiliate(pro.id); // no cookie
      state.jar.set(AFFILIATE_COOKIE, "bogus-zzzz");
      await stampProfessionalSignupWithAffiliate(pro.id); // unknown partner
      await prisma.affiliatePartner.update({ where: { id: partner.id }, data: { status: AffiliateStatus.SUSPENDED } });
      state.jar.set(AFFILIATE_COOKIE, partner.qrSlug);
      await stampProfessionalSignupWithAffiliate(pro.id); // suspended partner
      expect((await prisma.user.findUniqueOrThrow({ where: { id: pro.id } })).affiliatePartnerId).toBeNull();
    });

    it("first touch wins: an already-attributed professional is never re-pointed at another partner", async () => {
      const a = await makePartner("A");
      const b = await makePartner("B");
      const user = await makeUser(UserRole.PROFESSIONAL, { affiliatePartnerId: a.id });
      state.jar.set(AFFILIATE_COOKIE, b.qrSlug);
      await stampProfessionalSignupWithAffiliate(user.id);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).affiliatePartnerId).toBe(a.id);
    });

    it("the real sign-up action attributes a professional (even when email confirmation means no session yet), but not a homeowner", async () => {
      const partner = await makePartner();
      state.jar.set(AFFILIATE_COOKIE, partner.qrSlug);
      const form = (role: string, email: string) => {
        const f = new FormData();
        f.set("role", role);
        f.set("name", "New Person");
        f.set("email", email);
        f.set("password", "Correct-horse-battery-9");
        return f;
      };

      const pro = await makeUser(UserRole.PROFESSIONAL); // stands in for the row the Supabase trigger creates
      state.signUpUserId = pro.id;
      const out = await signup(undefined, form("PROFESSIONAL", pro.email));
      expect(out?.info).toMatch(/check your email/i);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: pro.id } })).affiliatePartnerId).toBe(partner.id);

      const homeowner = await makeUser(UserRole.HOMEOWNER);
      state.signUpUserId = homeowner.id;
      state.ip = "10.77.77.77";
      await signup(undefined, form("HOMEOWNER", homeowner.email));
      expect((await prisma.user.findUniqueOrThrow({ where: { id: homeowner.id } })).affiliatePartnerId).toBeNull();
    });
  });

  describe("credit when a referred professional's fee is paid", () => {
    it("credits half of each collected fee to the partner who brought the professional, and records which side brought it", async () => {
      const partner = await makePartner();
      const { pro } = await makePro({ partnerId: partner.id });
      const first = await job(pro, { feePence: 6000, quotePence: 120000 });
      expect(await creditAffiliateForTransaction(first.transaction.id)).toBe(3000);
      expect(await creditAffiliateForTransaction(first.transaction.id)).toBeNull(); // redelivery changes nothing
      const second = await job(pro, { feePence: 25000, quotePence: 900000 }); // fee capped at £250
      expect(await creditAffiliateForTransaction(second.transaction.id)).toBe(12500);

      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(15500);
      expect(await projectNow(first.project.id)).toMatchObject({ affiliatePartnerId: partner.id, affiliateSource: AffiliateSource.PROFESSIONAL, affiliatePayoutAmount: 3000 });
      expect(await prisma.activityLog.count({ where: { type: "affiliate_earning_credited", projectId: first.project.id } })).toBe(1);
    });

    it("promotions earn nothing: a free introductory job credits £0, and the next paid fee still earns", async () => {
      const partner = await makePartner();
      const { pro } = await makePro({ partnerId: partner.id });
      // Early-bird: the professional's first two marketplace jobs carry a £0 fee.
      for (let i = 0; i < 2; i++) {
        const free = await job(pro, { feePence: 0 });
        expect(await creditAffiliateForTransaction(free.transaction.id)).toBe(0);
      }
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(0);
      // Each free job told the partner why it earned nothing...
      expect(noFeeMail).toHaveBeenCalledTimes(2);
      expect(noFeeMail.mock.calls[0][0]).toMatchObject({ email: partner.email, contactName: "Sam", source: "PROFESSIONAL" });
      expect((await getPartnerNotices(partner.id, null)).map((n) => n.source)).toEqual(["PROFESSIONAL", "PROFESSIONAL"]);
      // ...and the first paid fee earns, with no notice.
      const paid = await job(pro, { feePence: 5000 });
      expect(await creditAffiliateForTransaction(paid.transaction.id)).toBe(2500);
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(2500);
      expect(noFeeMail).toHaveBeenCalledTimes(2);
      expect(await getPartnerNotices(partner.id, null)).toHaveLength(2);
    });

    it("a discounted fee earns half of the discounted amount, and a fee not yet paid earns nothing", async () => {
      const partner = await makePartner();
      const { pro } = await makePro({ partnerId: partner.id });
      const discounted = await job(pro, { feePence: 1000 }); // e.g. a 1% private-link fee
      expect(await creditAffiliateForTransaction(discounted.transaction.id)).toBe(500);
      const pending = await job(pro, { feePence: 5000, status: TransactionStatus.PENDING });
      expect(await creditAffiliateForTransaction(pending.transaction.id)).toBeNull();
      expect((await projectNow(pending.project.id)).affiliatePartnerId).toBeNull();
    });

    it("never shares one fee between two partners: the homeowner's partner wins, and the same partner is paid once", async () => {
      const homeownerPartner = await makePartner("Homeowner side");
      const proPartner = await makePartner("Pro side");
      const { pro } = await makePro({ partnerId: proPartner.id });

      const both = await job(pro, { feePence: 8000, homeownerPartnerId: homeownerPartner.id });
      expect(await creditAffiliateForTransaction(both.transaction.id)).toBe(4000);
      expect((await partnerNow(homeownerPartner.id)).totalEarningsPence).toBe(4000);
      expect((await partnerNow(proPartner.id)).totalEarningsPence).toBe(0);
      expect((await projectNow(both.project.id)).affiliateSource).toBe(AffiliateSource.HOMEOWNER);

      const sameBoth = await job(pro, { feePence: 8000, homeownerPartnerId: proPartner.id });
      expect(await creditAffiliateForTransaction(sameBoth.transaction.id)).toBe(4000);
      expect((await partnerNow(proPartner.id)).totalEarningsPence).toBe(4000); // once, not twice
    });

    it("credits nothing when the professional's partner is suspended or when the professional was not referred", async () => {
      const paused = await makePartner("Paused");
      const { pro } = await makePro({ partnerId: paused.id });
      await prisma.affiliatePartner.update({ where: { id: paused.id }, data: { status: AffiliateStatus.SUSPENDED } });
      const j = await job(pro, { feePence: 8000 });
      expect(await creditAffiliateForTransaction(j.transaction.id)).toBeNull();

      const { pro: organic } = await makePro();
      const k = await job(organic, { feePence: 8000 });
      expect(await creditAffiliateForTransaction(k.transaction.id)).toBeNull();
      expect((await partnerNow(paused.id)).totalEarningsPence).toBe(0);
    });

    it("earns for 12 months after the professional signs up: a recent referral earns, a long-established one no longer does", async () => {
      const partner = await makePartner();
      const recent = await makePro({ partnerId: partner.id, createdAt: new Date(Date.now() - 60 * 86_400_000) }); // two months ago
      const old = await makePro({ partnerId: partner.id, createdAt: new Date("2023-01-01T00:00:00Z") });
      const r = await job(recent.pro, { feePence: 4000 });
      expect(await creditAffiliateForTransaction(r.transaction.id)).toBe(2000);
      const o = await job(old.pro, { feePence: 4000 });
      expect(await creditAffiliateForTransaction(o.transaction.id)).toBeNull(); // past the 12 months
      expect((await projectNow(o.project.id)).affiliatePartnerId).toBeNull();
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(2000);
    });

    it("withdraws the earning if the fee is reversed, and credits it again if re-paid", async () => {
      const partner = await makePartner();
      const { pro } = await makePro({ partnerId: partner.id });
      const j = await job(pro, { feePence: 4000 });
      await creditAffiliateForTransaction(j.transaction.id);
      await prisma.transaction.update({ where: { id: j.transaction.id }, data: { status: TransactionStatus.CANCELLED } });
      expect(await reverseAffiliateForTransaction(j.transaction.id)).toBe(2000);
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(0);
      await prisma.transaction.update({ where: { id: j.transaction.id }, data: { status: TransactionStatus.PAID } });
      expect(await creditAffiliateForTransaction(j.transaction.id)).toBe(2000);
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(2000);
    });

    it("a partner who is the professional (same phone, written differently) earns nothing; an admin can release a false alarm", async () => {
      const partner = await createAffiliatePartner({ businessName: "Self Trader", contactName: "S", email: `${randomUUID()}@self.test`, phone: "07700 900123", category: "TRADE_SUPPLIER" });
      const { pro } = await makePro({ partnerId: partner.id, phone: "+44 7700 900123" });
      const j = await job(pro, { feePence: 6000 });
      expect(await creditAffiliateForTransaction(j.transaction.id)).toBe(0);
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(0);

      state.currentUser = await makeUser(UserRole.ADMIN);
      const held = await getBlockedSelfReferrals(partner.id);
      expect(held).toHaveLength(1);
      expect(held[0]).toMatchObject({ projectId: j.project.id, matched: "professional", wouldHaveEarnedPence: 3000 });
      await releaseSelfReferral(partner.id, j.project.id);
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(3000);
      expect((await projectNow(j.project.id)).affiliateSource).toBe(AffiliateSource.PROFESSIONAL);
    });
  });

  describe('"no fee on this job" notice', () => {
    it("tells the partner whose link brought a homeowner when that homeowner's chosen professional is on a free job — once, naming nobody", async () => {
      const partner = await makePartner();
      const { pro } = await makePro();
      const free = await job(pro, { feePence: 0, homeownerPartnerId: partner.id });
      expect(await creditAffiliateForTransaction(free.transaction.id)).toBe(0);
      expect(await creditAffiliateForTransaction(free.transaction.id)).toBeNull(); // a repeat does not tell them twice
      expect(noFeeMail).toHaveBeenCalledTimes(1);
      expect(noFeeMail.mock.calls[0][0]).toMatchObject({ email: partner.email, source: "HOMEOWNER", dashboardLink: "https://glowupp.test/partner/dashboard" });
      const [notice] = await getPartnerNotices(partner.id, null);
      expect(notice.source).toBe("HOMEOWNER");
      expect(JSON.stringify(noFeeMail.mock.calls[0][0])).not.toMatch(/Pro Ltd|@t\.test/);
    });

    it("a job with a fee to pay, an unreferred professional, or a suspended partner produce no notice", async () => {
      const partner = await makePartner();
      const { pro } = await makePro();
      await creditAffiliateForTransaction((await job(pro, { feePence: 5000, homeownerPartnerId: partner.id })).transaction.id);
      await creditAffiliateForTransaction((await job(pro, { feePence: 0 })).transaction.id); // no partner at all
      const paused = await makePartner("Paused");
      await prisma.affiliatePartner.update({ where: { id: paused.id }, data: { status: AffiliateStatus.SUSPENDED } });
      await creditAffiliateForTransaction((await job(pro, { feePence: 0, homeownerPartnerId: paused.id })).transaction.id);
      expect(noFeeMail).not.toHaveBeenCalled();
    });

    it("settleFreeJobForAffiliate handles a free job but leaves a fee that is still to pay alone", async () => {
      const partner = await makePartner();
      const { pro } = await makePro();
      const free = await job(pro, { feePence: 0, homeownerPartnerId: partner.id });
      const pending = await job(pro, { feePence: 4000, homeownerPartnerId: partner.id, status: TransactionStatus.PENDING });
      await settleFreeJobForAffiliate(free.transaction.quoteRequestId);
      await settleFreeJobForAffiliate(pending.transaction.quoteRequestId);
      await settleFreeJobForAffiliate(randomUUID()); // unknown id: no throw
      expect(noFeeMail).toHaveBeenCalledTimes(1);
      expect((await projectNow(pending.project.id)).affiliatePayoutAmount).toBeNull();
    });

    it("end to end: a homeowner who arrived through a partner's QR picks an early-bird professional, and the partner is told", async () => {
      const partner = await makePartner();
      const { pro } = await makePro(); // account created today, before Black Friday 2026 -> first two marketplace jobs are free
      const homeowner = await makeUser(UserRole.HOMEOWNER);
      state.jar.set(AFFILIATE_COOKIE, partner.qrSlug);
      const project = await getOrCreateDraftProject(homeowner.id, "kitchen", "Kitchen redesign");
      expect((await projectNow(project.id)).affiliatePartnerId).toBe(partner.id);
      await prisma.project.update({ where: { id: project.id }, data: { status: ProjectStatus.REQUESTING_QUOTES, postcode: "L1 2AB" } });
      const qr = await prisma.quoteRequest.create({
        data: { projectId: project.id, homeownerId: homeowner.id, professionalId: pro.id, status: QuoteRequestStatus.QUOTED, quoteAmount: 420000, quoteTimeline: "2 weeks" },
      });
      state.currentUser = homeowner;
      await selectProfessional(project.id, qr.id);

      expect(await prisma.transaction.findUniqueOrThrow({ where: { quoteRequestId: qr.id } })).toMatchObject({ feeAmount: 0, status: "PAID" });
      expect(noFeeMail).toHaveBeenCalledTimes(1);
      expect(noFeeMail.mock.calls[0][0]).toMatchObject({ email: partner.email, source: "HOMEOWNER" });
      expect(await projectNow(project.id)).toMatchObject({ affiliatePartnerId: partner.id, affiliatePayoutAmount: 0 });
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(0);
    });

    it("shows a pop-up for unseen notices, not again once dismissed, keeps them in Updates, and pops up again for a newer one", async () => {
      const partner = await makePartner();
      const { pro } = await makePro();
      const token = await issuePartnerLoginToken(partner.id);
      state.jar.set(PARTNER_COOKIE, token);

      let html = md(await PartnerDashboardPage(pageProps()));
      expect(html).not.toContain('role="dialog"');
      expect(html).toContain("Nothing to report");

      await creditAffiliateForTransaction((await job(pro, { feePence: 0, homeownerPartnerId: partner.id })).transaction.id);
      await creditAffiliateForTransaction((await job(pro, { feePence: 0, homeownerPartnerId: partner.id })).transaction.id);
      html = md(await PartnerDashboardPage(pageProps()));
      expect(html).toContain('role="dialog"');
      expect(html).toContain("No fee on some jobs from your link");
      expect(html).toContain("2 jobs: A homeowner you sent chose a professional who is on GlowUpp");
      expect(html).toContain("not a mistake");
      expect(html).toContain("Got it");

      await dismissPartnerNotices();
      html = md(await PartnerDashboardPage(pageProps()));
      expect(html).not.toContain('role="dialog"');
      expect(html.match(/A homeowner you sent chose a professional/g)).toHaveLength(2); // still listed under Updates

      await new Promise((r) => setTimeout(r, 15)); // a notice newer than the dismissal
      await creditAffiliateForTransaction((await job(pro, { feePence: 0, homeownerPartnerId: partner.id })).transaction.id);
      html = md(await PartnerDashboardPage(pageProps()));
      expect(html).toContain('role="dialog"');
      expect(html).toContain("No fee on a job from your link");
      expect(html).not.toContain("2 jobs:");
    });

    it("dismissing needs a signed-in partner", async () => {
      await expect(dismissPartnerNotices()).rejects.toThrow("NEXT_REDIRECT:/partner/login");
    });
  });

  describe("stats and pages", () => {
    it("the overview and the partner's dashboard count referred professionals and their paid jobs, and keep homeowner redesigns separate", async () => {
      const partner = await makePartner("Stats Trade Co");
      state.currentUser = await makeUser(UserRole.ADMIN);
      const { pro: p1 } = await makePro({ partnerId: partner.id });
      const { pro: p2 } = await makePro({ partnerId: partner.id });
      await makeUser(UserRole.HOMEOWNER, { affiliatePartnerId: partner.id }); // only professionals count as referred
      const j1 = await job(p1, { feePence: 6000, quotePence: 120000 });
      const j2 = await job(p2, { feePence: 0 });
      await creditAffiliateForTransaction(j1.transaction.id);
      await creditAffiliateForTransaction(j2.transaction.id);
      const homeJob = await job((await makePro()).pro, { feePence: 4000, homeownerPartnerId: partner.id, quotePence: 80000 });
      await creditAffiliateForTransaction(homeJob.transaction.id);

      const row = (await getAffiliateOverview()).find((r) => r.id === partner.id)!;
      expect(row).toMatchObject({ professionalsReferred: 2, referredProJobs: 2, projects: 1, conversions: 3, totalEarningsPence: 5000 });

      const dash = await getPartnerDashboard(partner.id);
      expect(dash).toMatchObject({ professionalsReferred: 2, referredProJobs: 2, projects: 1, totalEarningsPence: 5000 });
      expect(JSON.stringify(dash)).not.toMatch(/Pro Ltd|@t\.test/); // nobody's identity reaches the partner
    });

    it("the dashboard and the admin pages show the tradespeople link, the new counts and the promotions rule", async () => {
      const partner = await makePartner("Pages Trade Co");
      const { pro } = await makePro({ partnerId: partner.id });
      await creditAffiliateForTransaction((await job(pro, { feePence: 6000 })).transaction.id);

      const token = await (async () => {
        const { issuePartnerLoginToken } = await import("@/lib/data/affiliates");
        return issuePartnerLoginToken(partner.id);
      })();
      state.jar.set(PARTNER_COOKIE, token);
      const dash = md(await PartnerDashboardPage(pageProps()));
      expect(dash).toContain(`https://glowupp.test/a/${partner.qrSlug}/pro`);
      expect(dash).toContain("Tradespeople signed up");
      expect(dash).toContain("Paid jobs from them");
      expect(dash).toContain("Promotions such as free introductory jobs earn no share");
      expect(dash).toContain("For tradespeople");

      state.jar.clear();
      state.currentUser = await makeUser(UserRole.ADMIN);
      const overview = md(await AdminAffiliatesPage());
      expect(overview).toContain("Pros referred");
      const detail = md(await AdminAffiliatePartnerPage({ params: Promise.resolve({ id: partner.id }) } as never));
      expect(detail).toContain(`https://glowupp.test/a/${partner.qrSlug}/pro`);
      expect(detail).toContain("Tradespeople referred");
    });
  });
});
