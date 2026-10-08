/**
 * Integration tests for B2B partner self-onboarding (/partner/join): the
 * public sign-up API, magic-link login, the partner dashboard and the
 * success screen. Skipped unless PIPELINE_TEST_DB is set (scratch database
 * only, never production); email, Stripe and Supabase are mocked.
 *
 *   PIPELINE_TEST_DB=1 DATABASE_URL=postgres://... pnpm vitest run partner-onboarding.integration
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({
  currentUser: null as null | { id: string; role: string },
  jar: new Map<string, string>(),
  ip: "10.0.0.1",
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
vi.mock("@/lib/storage", () => ({ getSignedPhotoUrl: async () => "https://signed.test/render.jpg" }));
vi.mock("@/lib/notifications", () => ({
  APP_URL: "https://glowupp.test",
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
import { notifyPartnerLoginLink, notifyPartnerWelcome } from "@/lib/notifications";
import { hashLoginToken, PARTNER_COOKIE } from "@/lib/partner-session";
import { POST as selfRegister } from "@/app/api/affiliates/self-register/route";
import { GET as enterPartner } from "@/app/partner/enter/route";
import PartnerDashboardPage from "@/app/partner/dashboard/page";
import PartnerSuccessPage from "@/app/partner/success/page";
import PartnerJoinPage from "@/app/partner/join/page";
import PartnerLoginPage from "@/app/partner/login/page";
import { partnerSignOut, requestPartnerLoginLink } from "@/lib/actions/partner";
import { createAffiliate } from "@/lib/actions/affiliates";
import AdminAffiliatesPage from "@/app/admin/affiliates/page";
import { createAffiliatePartner, creditAffiliateForTransaction, findPartnerByLoginToken, getPartnerDashboard, issuePartnerLoginToken, recordAffiliatePayout } from "@/lib/data/affiliates";
import { AffiliateStatus, TransactionStatus, UserRole } from "@/generated/prisma/client";

const run = process.env.PIPELINE_TEST_DB ? describe : describe.skip;
const welcome = vi.mocked(notifyPartnerWelcome);
const loginMail = vi.mocked(notifyPartnerLoginLink);

const validBody = () => ({
  business_name: "Kite Coffee",
  contact_name: "Sam Taylor",
  email: `${randomUUID()}@Kite.Test`,
  phone: "07700 900123",
  category: "cafe",
  accept_terms: true,
});

function jsonPost(body: unknown, headers: Record<string, string> = {}) {
  return selfRegister(
    new NextRequest("https://glowupp.test/api/affiliates/self-register", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://glowupp.test", host: "glowupp.test", ...headers },
      body: JSON.stringify(body),
    })
  );
}
function formPost(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return selfRegister(new NextRequest("https://glowupp.test/api/affiliates/self-register", { method: "POST", body: fd }));
}
const cookieToken = (res: Response & { cookies: { get(n: string): { value: string } | undefined } }) => res.cookies.get(PARTNER_COOKIE)?.value;
const partnerByEmail = (email: string) => prisma.affiliatePartner.findUnique({ where: { email: email.toLowerCase() } });

async function registerOk(over: Record<string, unknown> = {}) {
  const body = { ...validBody(), ...over };
  const res = await jsonPost(body);
  expect(res.status).toBe(200);
  const partner = (await partnerByEmail(body.email as string))!;
  return { body, res, partner, token: cookieToken(res as never)! };
}
const pageProps = (searchParams: Record<string, string> = {}) => ({ searchParams: Promise.resolve(searchParams) }) as never;
const md = (node: unknown) => renderToStaticMarkup(node as never);

run("B2B partner self-onboarding", () => {
  beforeEach(() => {
    state.currentUser = null;
    state.jar.clear();
    state.ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    welcome.mockClear();
    loginMail.mockClear();
  });

  describe("POST /api/affiliates/self-register", () => {
    it("creates an ACTIVE 50% partner instantly, signs the new owner in, and sends one welcome email", async () => {
      const { body, res, partner, token } = await registerOk({ category: "trade_supplier" });
      expect(await res.json()).toEqual({ ok: true, redirect: "/partner/success" });

      expect(partner).toMatchObject({
        businessName: "Kite Coffee",
        contactName: "Sam Taylor",
        email: (body.email as string).toLowerCase(),
        phone: "07700 900123",
        category: "TRADE_SUPPLIER",
        status: AffiliateStatus.ACTIVE,
        selfRegistered: true,
        totalEarningsPence: 0,
      });
      expect(partner.revenueShareRate.toNumber()).toBe(0.5);
      expect(partner.referralCode).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
      expect(partner.qrSlug).toMatch(/^kite-coffee-[a-z2-9]{4}$/);
      expect(partner.termsAcceptedAt).toBeInstanceOf(Date);

      // Signed in by an httpOnly cookie; only the token's hash is in the database.
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect((res as never as { cookies: { get(n: string): { httpOnly?: boolean; sameSite?: string; path?: string } } }).cookies.get(PARTNER_COOKIE)).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
      const rows = await prisma.affiliateLoginToken.findMany({ where: { partnerId: partner.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].tokenHash).toBe(hashLoginToken(token));
      expect(rows[0].tokenHash).not.toContain(token);
      expect(rows[0].expiresAt.getTime()).toBeGreaterThan(Date.now() + 100 * 86_400_000);

      expect(welcome).toHaveBeenCalledTimes(1);
      expect(welcome).toHaveBeenCalledWith({
        email: partner.email,
        contactName: "Sam Taylor",
        businessName: "Kite Coffee",
        trackingLink: `https://glowupp.test/a/${partner.qrSlug}`,
        dashboardLink: `https://glowupp.test/partner/dashboard?token=${token}`,
        sharePercent: 50,
      });
      expect(await prisma.activityLog.count({ where: { type: "affiliate_partner_self_registered", metadata: { path: ["partnerId"], equals: partner.id } } })).toBe(1);
    });

    it("works as a plain HTML form post too: redirects to the success page, or back with a generic error and creates nothing", async () => {
      const email = `${randomUUID()}@kite.test`;
      const ok = await formPost({ business_name: "Form Cafe", contact_name: "Pat", email, phone: "07700 900124", category: "gym", accept_terms: "on" });
      expect(ok.status).toBe(303);
      expect(ok.headers.get("location")).toBe("/partner/success");
      expect((ok as never as { cookies: { get(n: string): unknown } }).cookies.get(PARTNER_COOKIE)).toBeTruthy();
      expect((await partnerByEmail(email))?.category).toBe("GYM");

      const bad = await formPost({ business_name: "Form Cafe", contact_name: "Pat", email: "x@y.test", phone: "07700 900124", category: "gym" }); // terms not ticked
      expect(bad.status).toBe(303);
      expect(bad.headers.get("location")).toBe("/partner/join?error=invalid");
      expect(await partnerByEmail("x@y.test")).toBeNull();
    });

    it.each([
      [{ business_name: "K" }, /business name/i],
      [{ contact_name: "" }, /name/i],
      [{ email: "not-an-email" }, /email/i],
      [{ phone: "abc" }, /phone/i],
      [{ category: "spaceship" }, /kind of business/i],
      [{ accept_terms: false }, /terms/i],
    ])("rejects bad input %o with a helpful message and creates nothing", async (over, message) => {
      const body = { ...validBody(), ...over };
      const res = await jsonPost(body);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(message);
      expect(await partnerByEmail(body.email)).toBeNull();
      expect(welcome).not.toHaveBeenCalled();
    });

    it("refuses a cross-site post, but allows same-site", async () => {
      const body = validBody();
      const evil = await jsonPost(body, { origin: "https://evil.example" });
      expect(evil.status).toBe(403);
      expect(await partnerByEmail(body.email)).toBeNull();
      expect((await jsonPost(body)).status).toBe(200);
    });

    it("rate-limits an IP to five sign-ups an hour", async () => {
      for (let i = 0; i < 5; i++) expect((await jsonPost(validBody())).status).toBe(200);
      const sixth = validBody();
      const blocked = await jsonPost(sixth);
      expect(blocked.status).toBe(429);
      expect(await partnerByEmail(sixth.email)).toBeNull();
    });

    it("ignores a bot that fills the hidden honeypot field", async () => {
      const body = { ...validBody(), website: "http://spam.example" };
      const res = await jsonPost(body);
      expect(res.status).toBe(200);
      expect(await partnerByEmail(body.email)).toBeNull();
      expect(welcome).not.toHaveBeenCalled();
      expect((res as never as { cookies: { get(n: string): unknown } }).cookies.get(PARTNER_COOKIE)).toBeUndefined();
    });

    it("never signs anyone in via an email that already has an account — it emails the real owner a fresh link instead", async () => {
      const first = await registerOk();
      state.ip = "10.9.9.9";
      const attacker = await jsonPost({ ...validBody(), email: first.partner.email, business_name: "Hijack Ltd", contact_name: "Mallory" });
      expect(attacker.status).toBe(200);
      expect(await attacker.json()).toEqual({ ok: true, redirect: "/partner/success?existing=1" });
      expect((attacker as never as { cookies: { get(n: string): unknown } }).cookies.get(PARTNER_COOKIE)).toBeUndefined(); // no session for the visitor

      const after = (await partnerByEmail(first.partner.email))!;
      expect(after).toMatchObject({ businessName: "Kite Coffee", contactName: "Sam Taylor" }); // nothing overwritten
      expect(await prisma.affiliatePartner.count({ where: { email: first.partner.email } })).toBe(1);

      expect(loginMail).toHaveBeenCalledTimes(1);
      const sent = loginMail.mock.calls[0][0];
      expect(sent.email).toBe(first.partner.email);
      expect(sent.contactName).toBe("Sam Taylor");
      const newToken = sent.dashboardLink.split("token=")[1];
      expect((await findPartnerByLoginToken(newToken))?.id).toBe(first.partner.id);
      // The real owner's existing session is NOT knocked out by someone else typing their email.
      expect((await findPartnerByLoginToken(first.token))?.id).toBe(first.partner.id);
    });

    it("limits link emails to three an hour per address", async () => {
      const first = await registerOk();
      for (let i = 0; i < 5; i++) {
        state.ip = `10.8.8.${i}`;
        await jsonPost({ ...validBody(), email: first.partner.email });
      }
      expect(loginMail).toHaveBeenCalledTimes(3);
    });
  });

  describe("magic link", () => {
    it("swaps a valid link for a session cookie and a clean dashboard URL; rejects unknown, expired or replaced links", async () => {
      const { partner, token } = await registerOk();
      const ok = await enterPartner(new NextRequest(`https://glowupp.test/partner/enter?token=${token}`));
      expect(ok.status).toBe(303);
      expect(ok.headers.get("location")).toBe("/partner/dashboard"); // token no longer in the URL
      expect(ok.headers.get("referrer-policy")).toBe("no-referrer");
      expect(ok.cookies.get(PARTNER_COOKIE)?.value).toBe(token);

      for (const bad of ["x".repeat(43), "short", ""]) {
        const res = await enterPartner(new NextRequest(`https://glowupp.test/partner/enter?token=${bad}`));
        expect(res.headers.get("location")).toBe("/partner/login?error=expired");
        expect(res.cookies.get(PARTNER_COOKIE)).toBeUndefined();
      }

      await prisma.affiliateLoginToken.updateMany({ where: { partnerId: partner.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await enterPartner(new NextRequest(`https://glowupp.test/partner/enter?token=${token}`))).headers.get("location")).toBe("/partner/login?error=expired");
    });

    it("emails a new link on request without revealing whether the address has an account", async () => {
      const { partner, token } = await registerOk();
      const fd = (email: string) => {
        const f = new FormData();
        f.set("email", email);
        return f;
      };
      const known = await requestPartnerLoginLink(undefined, fd(partner.email.toUpperCase()));
      const unknown = await requestPartnerLoginLink(undefined, fd(`${randomUUID()}@nobody.test`));
      expect(known).toEqual(unknown); // identical answer
      expect(known?.info).toMatch(/if that email has a partner account/i);
      expect(loginMail).toHaveBeenCalledTimes(1);
      expect(loginMail.mock.calls[0][0].email).toBe(partner.email);
      expect((await findPartnerByLoginToken(token))?.id).toBe(partner.id); // the existing session keeps working
      const newToken = loginMail.mock.calls[0][0].dashboardLink.split("token=")[1];
      expect((await findPartnerByLoginToken(newToken))?.id).toBe(partner.id);

      expect((await requestPartnerLoginLink(undefined, fd("not-an-email")))?.error).toBeTruthy();
    });
  });

  describe("sign-in tokens", () => {
    it("lets a partner hold several (phone + laptop), caps them at ten, and drops expired ones", async () => {
      const { partner, token } = await registerOk();
      const issued: string[] = [token];
      for (let i = 0; i < 11; i++) issued.push(await issuePartnerLoginToken(partner.id));
      expect(await prisma.affiliateLoginToken.count({ where: { partnerId: partner.id } })).toBe(10);
      expect(await findPartnerByLoginToken(issued[0])).toBeNull(); // the oldest was retired
      expect((await findPartnerByLoginToken(issued[11]))?.id).toBe(partner.id);
      expect((await findPartnerByLoginToken(issued[2]))?.id).toBe(partner.id);

      await prisma.affiliateLoginToken.updateMany({ where: { partnerId: partner.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      const fresh = await issuePartnerLoginToken(partner.id);
      expect(await prisma.affiliateLoginToken.count({ where: { partnerId: partner.id } })).toBe(1); // expired ones cleaned out
      expect((await findPartnerByLoginToken(fresh))?.id).toBe(partner.id);
    });

    it("tokens belong to one partner only", async () => {
      const a = await registerOk();
      const b = await registerOk();
      expect((await findPartnerByLoginToken(a.token))?.id).toBe(a.partner.id);
      expect((await findPartnerByLoginToken(b.token))?.id).toBe(b.partner.id);
      expect(a.partner.id).not.toBe(b.partner.id);
    });

    it("signing out retires this device's token only", async () => {
      const { partner, token } = await registerOk();
      const otherDevice = await issuePartnerLoginToken(partner.id);
      state.jar.set(PARTNER_COOKIE, token);
      await expect(partnerSignOut()).rejects.toThrow("NEXT_REDIRECT:/partner/login");
      expect(await findPartnerByLoginToken(token)).toBeNull();
      expect((await findPartnerByLoginToken(otherDevice))?.id).toBe(partner.id);
    });
  });

  describe("pages", () => {
    it("the join page shows the five fields and the terms; the login page offers a new link", async () => {
      const join = md(await PartnerJoinPage(pageProps()));
      for (const name of ["business_name", "contact_name", "email", "phone", "category", "accept_terms"]) expect(join).toContain(`name="${name}"`);
      for (const value of ["cafe", "gym", "garden_center", "salon", "trade_supplier", "influencer_other"]) expect(join).toContain(`value="${value}"`);
      expect(join).toContain('action="/api/affiliates/self-register"');
      expect(join).toContain("50%");
      expect(md(await PartnerJoinPage(pageProps({ error: "busy" })))).toContain("Too many attempts");
      expect(md(await PartnerLoginPage(pageProps({ error: "expired" })))).toContain("expired or isn&#x27;t valid");
    });

    it("the success page celebrates by name, shows the QR and the download and dashboard buttons", async () => {
      const { partner, token } = await registerOk({ business_name: "Kite & Co <Coffee>" });
      state.jar.set(PARTNER_COOKIE, token);
      const html = md(await PartnerSuccessPage());
      expect(html).toContain("You&#x27;re All Set, Kite &amp; Co &lt;Coffee&gt;!");
      expect(html).toContain("Download Printable Poster PDF");
      expect(html).toContain("View My Live Revenue Dashboard");
      expect(html).toContain('href="/partner/dashboard"');
      expect(html).toContain(`glowupp.test/a/${partner.qrSlug}`);
      expect(html).toContain("<svg"); // the QR
    });

    it("the success page for a visitor with no session reveals nothing about any account", async () => {
      const first = await registerOk();
      state.jar.clear();
      const html = md(await PartnerSuccessPage());
      expect(html).toContain("Check your inbox");
      expect(html).not.toContain(first.partner.businessName);
      expect(html).not.toContain(first.partner.qrSlug);
    });

    it("the dashboard: magic-link param is bounced through /partner/enter; no session goes to sign-in; a session shows only that partner's own numbers", async () => {
      await expect(PartnerDashboardPage(pageProps({ token: "abc" }))).rejects.toThrow("NEXT_REDIRECT:/partner/enter?token=abc");
      await expect(PartnerDashboardPage(pageProps())).rejects.toThrow("NEXT_REDIRECT:/partner/login");

      const mine = await registerOk({ business_name: "My Cafe" });
      const other = await createAffiliatePartner({ businessName: "Rival Gym", contactName: "R", email: `${randomUUID()}@rival.test`, phone: null, category: "GYM" });
      // Give the partner one paid job so there is money to show, plus a payout.
      const homeowner = await prisma.user.create({ data: { id: randomUUID(), role: UserRole.HOMEOWNER, name: "Secret Homeowner", email: `${randomUUID()}@h.test` } });
      const proUser = await prisma.user.create({ data: { id: randomUUID(), role: UserRole.PROFESSIONAL, name: "Secret Pro", email: `${randomUUID()}@p.test` } });
      const pro = await prisma.professional.create({ data: { userId: proUser.id, businessName: "Secret Builders Ltd", postcode: "L1 2AB", serviceAreaPrefixes: ["L"] } });
      const project = await prisma.project.create({ data: { homeownerId: homeowner.id, projectType: "kitchen", title: "Secret kitchen", postcode: "L1 2AB", affiliatePartnerId: mine.partner.id } });
      const quote = await prisma.quoteRequest.create({ data: { projectId: project.id, homeownerId: homeowner.id, professionalId: pro.id, selected: true, quoteAmount: 987654 } });
      const tx = await prisma.transaction.create({ data: { quoteRequestId: quote.id, professionalId: pro.id, projectId: project.id, feeAmount: 24690, status: TransactionStatus.PAID } });
      await creditAffiliateForTransaction(tx.id); // 50% of £246.90 = £123.45
      const admin = await prisma.user.create({ data: { id: randomUUID(), role: UserRole.ADMIN, name: "Admin", email: `${randomUUID()}@a.test` } });
      await recordAffiliatePayout(mine.partner.id, 12345, admin.id, "secret bank ref");

      state.jar.set(PARTNER_COOKIE, mine.token);
      const html = md(await PartnerDashboardPage(pageProps()));
      expect(html).toContain("My Cafe");
      expect(html).toContain("£123.45"); // earned
      expect(html).toContain("Your 50% share earned");
      expect(html).toContain('id="materials"');
      expect(html).toContain("Download high-res PNG");
      expect(html).toContain(`https://glowupp.test/a/${mine.partner.qrSlug}`);
      for (const secret of ["Rival Gym", other.qrSlug, "Secret Homeowner", "Secret Pro", "Secret Builders", "Secret kitchen", "secret bank ref", "9,876.54", "246.90", "£246"]) {
        expect(html).not.toContain(secret);
      }

      const data = await getPartnerDashboard(mine.partner.id);
      expect(Object.keys(data!).sort()).toEqual(
        ["balancePence", "businessName", "clickCount", "contactName", "conversions", "paidEarningsPence", "payouts", "projects", "qrSlug", "revenueSharePercent", "status", "totalEarningsPence"].sort()
      );
      expect(data).toMatchObject({ conversions: 1, projects: 1, totalEarningsPence: 12345, paidEarningsPence: 12345, balancePence: 0 });
    });

    it("a suspended partner still sees their dashboard, with a notice", async () => {
      const { partner, token } = await registerOk();
      await prisma.affiliatePartner.update({ where: { id: partner.id }, data: { status: AffiliateStatus.SUSPENDED } });
      state.jar.set(PARTNER_COOKIE, token);
      expect(md(await PartnerDashboardPage(pageProps()))).toContain("Your account is paused");
    });
  });

  describe("admin side", () => {
    it("flags self-registered partners for vetting, and an admin cannot create a second partner with the same email", async () => {
      const { partner } = await registerOk({ business_name: "Vet Me Cafe" });
      state.currentUser = await prisma.user.create({ data: { id: randomUUID(), role: UserRole.ADMIN, name: "Admin", email: `${randomUUID()}@a.test` } });
      expect(md(await AdminAffiliatesPage())).toContain("Self-registered — vet before paying");

      const fd = new FormData();
      fd.set("businessName", "Duplicate Cafe");
      fd.set("contactName", "Dee");
      fd.set("email", partner.email.toUpperCase());
      fd.set("category", "CAFE");
      expect((await createAffiliate(undefined, fd))?.error).toMatch(/already exists/i);
      expect(await prisma.affiliatePartner.count({ where: { email: partner.email } })).toBe(1);
    });
  });
});
