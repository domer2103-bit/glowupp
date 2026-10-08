/**
 * Integration tests for the B2B Affiliate & Partner Program — attribution,
 * the 50/50 credit when a lead fee is paid, reversal, payouts and the admin
 * actions. They run against a real Postgres, so they're skipped unless
 * PIPELINE_TEST_DB is set (and DATABASE_URL points at a scratch database
 * with the schema loaded — never production). Everything that talks to
 * Next/Supabase/email/Stripe is mocked; Prisma and the app's own logic are
 * real.
 *
 *   PIPELINE_TEST_DB=1 DATABASE_URL=postgres://... pnpm vitest run affiliates.integration
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({ currentUser: null as null | { id: string; role: string }, jar: new Map<string, string>() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (state.jar.has(n) ? { name: n, value: state.jar.get(n)! } : undefined),
    delete: (n: string) => state.jar.delete(n),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
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
// A single pooled connection, so the scratch database (PGlite) works as well as a real one.
vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  return { prisma: new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }) }) };
});
vi.mock("@/lib/storage", () => ({ getSignedPhotoUrl: async () => "https://signed.test/render.jpg" }));
vi.mock("@/lib/stripe", () => ({ stripe: { webhooks: { constructEvent: (body: string) => JSON.parse(body) } } }));
vi.mock("@/lib/notifications", () => ({
  APP_URL: "https://glowupp.test",
  notifyLeadFeePaid: vi.fn(),
  notifyPrivateEstimateRequested: vi.fn(),
  notifyPrivateQuoteSubmitted: vi.fn(),
  notifyOpenMarketProject: vi.fn(),
  notifyQuoteSubmitted: vi.fn(),
  notifyProfessionalSelected: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { AFFILIATE_COOKIE } from "@/lib/affiliate-cookie";
import { GET as affiliateLink } from "@/app/a/[code]/route";
import { POST as stripeWebhook } from "@/app/api/webhooks/stripe/route";
import { createAffiliate, markAffiliatePaid, setAffiliateStatus } from "@/lib/actions/affiliates";
import { updateTransactionStatus } from "@/lib/actions/admin";
import {
  createAffiliatePartner,
  creditAffiliateForTransaction,
  getAffiliateOverview,
  recordAffiliatePayout,
  reverseAffiliateForTransaction,
} from "@/lib/data/affiliates";
import { getOrCreateDraftProject } from "@/lib/data/projects";
import AdminAffiliatesPage from "@/app/admin/affiliates/page";
import AdminAffiliatePartnerPage from "@/app/admin/affiliates/[id]/page";
import AdminHubPage from "@/app/admin/page";
import { AffiliateStatus, TransactionStatus, UserRole } from "@/generated/prisma/client";

const run = process.env.PIPELINE_TEST_DB ? describe : describe.skip;

async function makeUser(role: UserRole, name: string = role) {
  const id = randomUUID();
  return prisma.user.create({ data: { id, role, name, email: `${id}@test.local` } });
}
async function makePartner(businessName = "The Daily Grind") {
  return createAffiliatePartner({ businessName, contactName: "Sam", email: `${randomUUID()}@test.local`, phone: null, category: "CAFE" });
}
async function makePro() {
  const user = await makeUser(UserRole.PROFESSIONAL, "Pro");
  return prisma.professional.create({ data: { userId: user.id, businessName: "Pro Ltd", postcode: "L1 2AB", serviceAreaPrefixes: ["L"] } });
}

/** A project that a homeowner started via `partnerId`, with a selected quote and a lead fee in `status`. */
async function jobWithFee(opts: { partnerId: string | null; feePence: number; quotePence?: number; status?: TransactionStatus }) {
  const homeowner = await makeUser(UserRole.HOMEOWNER);
  const pro = await makePro();
  const project = await prisma.project.create({
    data: { homeownerId: homeowner.id, projectType: "kitchen", title: "Kitchen", postcode: "L1 2AB", affiliatePartnerId: opts.partnerId },
  });
  const quote = await prisma.quoteRequest.create({
    data: { projectId: project.id, homeownerId: homeowner.id, professionalId: pro.id, selected: true, quoteAmount: opts.quotePence ?? opts.feePence * 20 },
  });
  const transaction = await prisma.transaction.create({
    data: { quoteRequestId: quote.id, professionalId: pro.id, projectId: project.id, feeAmount: opts.feePence, status: opts.status ?? TransactionStatus.PENDING },
  });
  return { homeowner, pro, project, transaction };
}
const partnerNow = (id: string) => prisma.affiliatePartner.findUniqueOrThrow({ where: { id } });
const projectNow = (id: string) => prisma.project.findUniqueOrThrow({ where: { id } });
const markPaid = (transactionId: string) => prisma.transaction.update({ where: { id: transactionId }, data: { status: TransactionStatus.PAID, paidAt: new Date() } });

function linkRequest(code: string, cookie?: string) {
  const req = new NextRequest(`https://glowupp.test/a/${code}`, cookie ? { headers: { cookie: `${AFFILIATE_COOKIE}=${cookie}` } } : undefined);
  return affiliateLink(req, { params: Promise.resolve({ code }) } as never);
}

run("B2B Affiliate & Partner Program", () => {
  beforeEach(() => {
    state.currentUser = null;
    state.jar.clear();
  });

  describe("/a/[code] link", () => {
    it("remembers the partner in a cookie, counts the click and lands on the tagged category chooser", async () => {
      const partner = await makePartner();
      const res = await linkRequest(partner.qrSlug);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`/?utm_source=affiliate&utm_medium=qr&utm_campaign=${partner.qrSlug}#categories`);
      expect(res.cookies.get(AFFILIATE_COOKIE)?.value).toBe(partner.qrSlug);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect((await partnerNow(partner.id)).clickCount).toBe(1);

      // The 8-character code works too, in any case.
      const byCode = await linkRequest(partner.referralCode.toLowerCase());
      expect(byCode.cookies.get(AFFILIATE_COOKIE)?.value).toBe(partner.qrSlug);
      expect((await partnerNow(partner.id)).clickCount).toBe(2);
    });

    it("sets no cookie for an unknown, malformed or suspended code, but still lands people on the site", async () => {
      const suspended = await makePartner("Closed Cafe");
      await prisma.affiliatePartner.update({ where: { id: suspended.id }, data: { status: AffiliateStatus.SUSPENDED } });
      for (const code of ["nope-zzzz", "ZZZZZZZZ", "../etc/passwd", suspended.qrSlug]) {
        const res = await linkRequest(code);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("/#categories");
        expect(res.cookies.get(AFFILIATE_COOKIE)).toBeUndefined();
      }
      expect((await partnerNow(suspended.id)).clickCount).toBe(0);
    });

    it("first partner wins: a second partner's QR does not overwrite a live cookie, but replaces a stale one", async () => {
      const first = await makePartner("First Cafe");
      const second = await makePartner("Second Cafe");
      const kept = await linkRequest(second.qrSlug, first.qrSlug);
      expect(kept.cookies.get(AFFILIATE_COOKIE)).toBeUndefined(); // existing cookie stays in the browser
      expect((await partnerNow(second.id)).clickCount).toBe(1); // but the scan is still counted

      const replaced = await linkRequest(second.qrSlug, "gone-zzzz");
      expect(replaced.cookies.get(AFFILIATE_COOKIE)?.value).toBe(second.qrSlug);
    });
  });

  describe("attribution onto the project", () => {
    it("stamps a new wizard project with the partner from the cookie, and logs it", async () => {
      const partner = await makePartner();
      const guest = await makeUser(UserRole.HOMEOWNER, "guest");
      state.jar.set(AFFILIATE_COOKIE, partner.qrSlug);
      const project = await getOrCreateDraftProject(guest.id, "kitchen", "Kitchen redesign");
      expect((await projectNow(project.id)).affiliatePartnerId).toBe(partner.id);
      expect(await prisma.activityLog.count({ where: { projectId: project.id, type: "affiliate_attributed" } })).toBe(1);
    });

    it("leaves a project alone with no cookie, a bad cookie, or a suspended partner", async () => {
      const partner = await makePartner();
      const noCookie = await getOrCreateDraftProject((await makeUser(UserRole.HOMEOWNER)).id, "kitchen", "Kitchen redesign");
      expect((await projectNow(noCookie.id)).affiliatePartnerId).toBeNull();

      state.jar.set(AFFILIATE_COOKIE, "bogus-zzzz");
      const bad = await getOrCreateDraftProject((await makeUser(UserRole.HOMEOWNER)).id, "kitchen", "Kitchen redesign");
      expect((await projectNow(bad.id)).affiliatePartnerId).toBeNull();

      await prisma.affiliatePartner.update({ where: { id: partner.id }, data: { status: AffiliateStatus.SUSPENDED } });
      state.jar.set(AFFILIATE_COOKIE, partner.qrSlug);
      const suspended = await getOrCreateDraftProject((await makeUser(UserRole.HOMEOWNER)).id, "kitchen", "Kitchen redesign");
      expect((await projectNow(suspended.id)).affiliatePartnerId).toBeNull();
    });

    it("first touch wins: an already-attributed project is never re-pointed at another partner", async () => {
      const a = await makePartner("A Cafe");
      const b = await makePartner("B Cafe");
      const homeowner = await makeUser(UserRole.HOMEOWNER);
      state.jar.set(AFFILIATE_COOKIE, a.qrSlug);
      const project = await getOrCreateDraftProject(homeowner.id, "kitchen", "Kitchen redesign");
      state.jar.set(AFFILIATE_COOKIE, b.qrSlug);
      const again = await getOrCreateDraftProject(homeowner.id, "kitchen", "Kitchen redesign");
      expect(again.id).toBe(project.id);
      expect((await projectNow(project.id)).affiliatePartnerId).toBe(a.id);
    });
  });

  describe("50/50 credit when the lead fee is paid", () => {
    it("credits half of the collected fee exactly once, however often it is triggered", async () => {
      const partner = await makePartner();
      const { project, transaction } = await jobWithFee({ partnerId: partner.id, feePence: 2500, quotePence: 50000 }); // £500 job, 5% = £25

      expect(await creditAffiliateForTransaction(transaction.id)).toBeNull(); // still PENDING: nothing collected yet
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(0);

      await markPaid(transaction.id);
      expect(await creditAffiliateForTransaction(transaction.id)).toBe(1250); // £12.50
      expect(await creditAffiliateForTransaction(transaction.id)).toBeNull(); // redelivery / re-click
      await Promise.all([creditAffiliateForTransaction(transaction.id), creditAffiliateForTransaction(transaction.id)]);

      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(1250);
      expect((await projectNow(project.id)).affiliatePayoutAmount).toBe(1250);
      expect(await prisma.activityLog.count({ where: { projectId: project.id, type: "affiliate_earning_credited" } })).toBe(1);
    });

    it("pays nothing on a free job, a non-affiliate job, or when the partner is suspended", async () => {
      const partner = await makePartner();
      const free = await jobWithFee({ partnerId: partner.id, feePence: 0, status: TransactionStatus.PAID });
      expect(await creditAffiliateForTransaction(free.transaction.id)).toBe(0);
      expect((await projectNow(free.project.id)).affiliatePayoutAmount).toBe(0);

      const organic = await jobWithFee({ partnerId: null, feePence: 2500, status: TransactionStatus.PAID });
      expect(await creditAffiliateForTransaction(organic.transaction.id)).toBeNull();
      expect((await projectNow(organic.project.id)).affiliatePayoutAmount).toBeNull();

      const paused = await makePartner("Paused Cafe");
      await prisma.affiliatePartner.update({ where: { id: paused.id }, data: { status: AffiliateStatus.SUSPENDED } });
      const job = await jobWithFee({ partnerId: paused.id, feePence: 2500, status: TransactionStatus.PAID });
      expect(await creditAffiliateForTransaction(job.transaction.id)).toBeNull();

      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(0);
      expect((await partnerNow(paused.id)).totalEarningsPence).toBe(0);
    });

    it("uses the partner's own rate and rounds down to the penny", async () => {
      const partner = await makePartner();
      await prisma.affiliatePartner.update({ where: { id: partner.id }, data: { revenueShareRate: "0.3000" } });
      const job = await jobWithFee({ partnerId: partner.id, feePence: 2501, status: TransactionStatus.PAID });
      expect(await creditAffiliateForTransaction(job.transaction.id)).toBe(750); // 30% of £25.01 = £7.503
    });

    it("withdraws the earning when a paid fee is moved back, and credits it again if it is re-paid", async () => {
      const partner = await makePartner();
      const { project, transaction } = await jobWithFee({ partnerId: partner.id, feePence: 4000, status: TransactionStatus.PAID });
      await creditAffiliateForTransaction(transaction.id);
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(2000);

      expect(await reverseAffiliateForTransaction(transaction.id)).toBeNull(); // still PAID: nothing to reverse
      await prisma.transaction.update({ where: { id: transaction.id }, data: { status: TransactionStatus.CANCELLED } });
      expect(await reverseAffiliateForTransaction(transaction.id)).toBe(2000);
      expect(await reverseAffiliateForTransaction(transaction.id)).toBeNull();
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(0);
      expect((await projectNow(project.id)).affiliatePayoutAmount).toBeNull();

      await markPaid(transaction.id);
      expect(await creditAffiliateForTransaction(transaction.id)).toBe(2000);
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(2000);
    });

    it("credits the partner when Stripe confirms the fee, and a redelivered webhook changes nothing", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
      const partner = await makePartner();
      const { project, transaction } = await jobWithFee({ partnerId: partner.id, feePence: 6000 });
      const paymentIntent = `pi_${randomUUID()}`; // unique per run: the column is unique and the scratch database persists
      const deliver = () =>
        stripeWebhook(
          new NextRequest("https://glowupp.test/api/webhooks/stripe", {
            method: "POST",
            headers: { "stripe-signature": "t=1,v1=x" },
            body: JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_test", metadata: { transactionId: transaction.id }, payment_intent: paymentIntent } } }),
          })
        );
      expect((await deliver()).status).toBe(200);
      expect((await deliver()).status).toBe(200);

      expect((await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } })).status).toBe(TransactionStatus.PAID);
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(3000);
      expect((await projectNow(project.id)).affiliatePayoutAmount).toBe(3000);
    });
  });

  describe("payouts", () => {
    it("records exactly the balance the admin saw, once, and keeps a log", async () => {
      const partner = await makePartner();
      const admin = await makeUser(UserRole.ADMIN, "Admin Ann");
      const job = await jobWithFee({ partnerId: partner.id, feePence: 2500, status: TransactionStatus.PAID });
      await creditAffiliateForTransaction(job.transaction.id);

      expect(await recordAffiliatePayout(partner.id, 999, admin.id, null)).toBe(false); // stale / wrong amount
      expect(await recordAffiliatePayout(partner.id, 0, admin.id, null)).toBe(false);
      expect(await recordAffiliatePayout(partner.id, 1250, admin.id, "BACS ref 42")).toBe(true);
      expect(await recordAffiliatePayout(partner.id, 1250, admin.id, null)).toBe(false); // already paid

      const after = await partnerNow(partner.id);
      expect(after).toMatchObject({ totalEarningsPence: 1250, paidEarningsPence: 1250 });
      const payouts = await prisma.affiliatePayout.findMany({ where: { partnerId: partner.id } });
      expect(payouts).toHaveLength(1);
      expect(payouts[0]).toMatchObject({ amountPence: 1250, note: "BACS ref 42", paidById: admin.id });
    });

    it("a fee reversed after payout leaves a negative balance to settle by hand", async () => {
      const partner = await makePartner();
      const admin = await makeUser(UserRole.ADMIN);
      const job = await jobWithFee({ partnerId: partner.id, feePence: 2500, status: TransactionStatus.PAID });
      await creditAffiliateForTransaction(job.transaction.id);
      await recordAffiliatePayout(partner.id, 1250, admin.id, null);
      await prisma.transaction.update({ where: { id: job.transaction.id }, data: { status: TransactionStatus.CANCELLED } });
      await reverseAffiliateForTransaction(job.transaction.id);
      const row = (await (async () => {
        state.currentUser = admin;
        return getAffiliateOverview();
      })()).find((r) => r.id === partner.id)!;
      expect(row).toMatchObject({ totalEarningsPence: 0, paidEarningsPence: 1250, balancePence: -1250 });
    });
  });

  describe("admin actions and overview", () => {
    it("only an admin can create, suspend or pay partners", async () => {
      const partner = await makePartner();
      state.currentUser = await makeUser(UserRole.HOMEOWNER);
      const fd = new FormData();
      await expect(createAffiliate(undefined, fd)).rejects.toThrow("NEXT_REDIRECT:/dashboard");
      await expect(setAffiliateStatus(partner.id, "SUSPENDED")).rejects.toThrow("NEXT_REDIRECT:/dashboard");
      await expect(markAffiliatePaid(partner.id, 100, fd)).rejects.toThrow("NEXT_REDIRECT:/dashboard");
      await expect(getAffiliateOverview()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
      expect((await partnerNow(partner.id)).status).toBe(AffiliateStatus.ACTIVE);
    });

    it("creates a partner from the form with a code, slug and 50% share, rejecting bad input", async () => {
      state.currentUser = await makeUser(UserRole.ADMIN);
      const bad = new FormData();
      bad.set("businessName", "X");
      bad.set("contactName", "Sam");
      bad.set("email", "not-an-email");
      bad.set("category", "CAFE");
      expect((await createAffiliate(undefined, bad))?.error).toMatch(/business name/i);
      bad.set("businessName", "Pilates Pod");
      expect((await createAffiliate(undefined, bad))?.error).toMatch(/email/i);
      const unique = randomUUID().slice(0, 8);
      bad.set("email", `Sam-${unique}@Pilates.Test`);
      bad.set("category", "SPACESHIP");
      expect((await createAffiliate(undefined, bad))?.error).toBeTruthy();

      bad.set("category", "GYM");
      bad.set("phone", " 07700 900123 ");
      const redirect = await createAffiliate(undefined, bad).catch((e: Error) => e.message);
      expect(redirect).toMatch(/^NEXT_REDIRECT:\/admin\/affiliates\/[0-9a-f-]{36}$/);
      const created = await prisma.affiliatePartner.findFirstOrThrow({ where: { email: `sam-${unique}@pilates.test` } });
      expect(created).toMatchObject({ email: `sam-${unique}@pilates.test`, phone: "07700 900123", category: "GYM", status: "ACTIVE", totalEarningsPence: 0 });
      expect(created.revenueShareRate.toNumber()).toBe(0.5);
      expect(created.referralCode).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
      expect(created.qrSlug).toMatch(/^pilates-pod-[a-z2-9]{4}$/);
    });

    it("marking a lead fee paid or un-paid in the admin keeps the partner's earnings in step", async () => {
      const partner = await makePartner();
      state.currentUser = await makeUser(UserRole.ADMIN);
      const { transaction } = await jobWithFee({ partnerId: partner.id, feePence: 10000 });
      await updateTransactionStatus(transaction.id, "PAID");
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(5000);
      await updateTransactionStatus(transaction.id, "CANCELLED");
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(0);
      await updateTransactionStatus(transaction.id, "PAID");
      expect((await partnerNow(partner.id)).totalEarningsPence).toBe(5000);
    });

    it("the overview reports clicks, projects, conversions, job value, GlowUpp profit and the owed balance", async () => {
      const partner = await makePartner("Overview Cafe");
      await linkRequest(partner.qrSlug);
      await linkRequest(partner.qrSlug);
      state.currentUser = await makeUser(UserRole.ADMIN);
      const paid = await jobWithFee({ partnerId: partner.id, feePence: 2500, quotePence: 50000, status: TransactionStatus.PAID });
      await creditAffiliateForTransaction(paid.transaction.id);
      await jobWithFee({ partnerId: partner.id, feePence: 4000, quotePence: 80000, status: TransactionStatus.PENDING }); // chosen, fee not yet paid
      const homeowner = await makeUser(UserRole.HOMEOWNER);
      await prisma.project.create({ data: { homeownerId: homeowner.id, projectType: "bathroom", title: "Bath", postcode: "", affiliatePartnerId: partner.id } }); // started, not converted

      const row = (await getAffiliateOverview()).find((r) => r.id === partner.id)!;
      expect(row).toMatchObject({
        clickCount: 2,
        projects: 3,
        conversions: 2,
        gmvPence: 130000,
        glowuppProfitPence: 2500, // only the fee actually collected
        totalEarningsPence: 1250,
        paidEarningsPence: 0,
        balancePence: 1250,
        revenueShareRate: 0.5,
      });
    });
  });

  describe("admin pages render", () => {
    it("the hub, the overview table and a partner page show real numbers and the right controls", async () => {
      state.currentUser = await makeUser(UserRole.ADMIN);
      const partner = await makePartner("Render Test Cafe");
      const paid = await jobWithFee({ partnerId: partner.id, feePence: 2500, quotePence: 50000, status: TransactionStatus.PAID });
      await creditAffiliateForTransaction(paid.transaction.id);

      const hub = renderToStaticMarkup(await AdminHubPage());
      expect(hub).toContain("Partner program");
      expect(hub).toContain("to pay");

      const overview = renderToStaticMarkup(await AdminAffiliatesPage());
      expect(overview).toContain("Create new B2B partner");
      expect(overview).toContain("Render Test Cafe");
      expect(overview).toContain("£12.50"); // partner share and owed balance
      expect(overview).toContain("Mark £12.50 paid");
      expect(overview).toContain("Suspend");

      const detail = renderToStaticMarkup(await AdminAffiliatePartnerPage({ params: Promise.resolve({ id: partner.id }) } as never));
      expect(detail).toContain("Render Test Cafe");
      expect(detail).toContain(`https://glowupp.test/a/${partner.qrSlug}`);
      expect(detail).toContain("Download high-res PNG");
      expect(detail).toContain("Export PDF");
      expect(detail).toContain("Mark £12.50 paid");

      await expect(AdminAffiliatePartnerPage({ params: Promise.resolve({ id: randomUUID() }) } as never)).rejects.toThrow("NEXT_NOT_FOUND");
      await expect(AdminAffiliatePartnerPage({ params: Promise.resolve({ id: "not-a-uuid" }) } as never)).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("a non-admin is bounced from every affiliate page", async () => {
      state.currentUser = await makeUser(UserRole.HOMEOWNER);
      await expect(AdminAffiliatesPage()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
      await expect(AdminAffiliatePartnerPage({ params: Promise.resolve({ id: randomUUID() }) } as never)).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    });
  });
});
