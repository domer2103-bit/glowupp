/**
 * Integration tests for the Private Client Pipeline lock — they run
 * against a real Postgres, so they're skipped unless PIPELINE_TEST_DB is
 * set (and DATABASE_URL points at a scratch database with the schema
 * loaded — never production). Everything that talks to Next/Supabase/email
 * is mocked; Prisma and the app's own logic are real.
 *
 *   PIPELINE_TEST_DB=1 DATABASE_URL=postgres://... pnpm vitest run private-pipeline.integration
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

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
vi.mock("@/lib/notifications", () => ({
  APP_URL: "https://glowupp.test",
  notifyPartnerNoFeeJob: vi.fn(),
  notifyPrivateEstimateRequested: vi.fn(),
  notifyPrivateQuoteSubmitted: vi.fn(),
  notifyOpenMarketProject: vi.fn(),
  notifyQuoteSubmitted: vi.fn(),
  notifyProfessionalSelected: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { PRO_REF_COOKIE } from "@/lib/private-pipeline-cookie";
import { GUEST_COOKIE } from "@/lib/guest-cookie";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { countPriorPrivateLinkJobs, ensureReferralCodes, findReferrerByCode, findReferrerBySlug, listPrivateLeads, notPrivatePipelineWhere } from "@/lib/data/private-pipeline";
import { getOrCreateDraftProject } from "@/lib/data/projects";
import { getOpenMarketProjects, getProfessionalQuotes } from "@/lib/data/quotes";
import { mergeGuestIntoUser } from "@/lib/guest";
import { pushToOpenMarket, selectProfessional, submitOpenMarketQuote } from "@/lib/actions/quotes";
import { markDepositReceived, requestPrivateEstimate, submitPrivateQuote } from "@/lib/actions/private-pipeline";
import { ProjectStatus, QuoteRequestStatus, UserRole, VerificationStatus } from "@/generated/prisma/client";

const run = process.env.PIPELINE_TEST_DB ? describe : describe.skip;

async function makeUser(role: UserRole, extra: { isGuest?: boolean; name?: string } = {}) {
  const id = randomUUID();
  return prisma.user.create({ data: { id, role, name: extra.name ?? role, email: `${id}@test.local`, isGuest: extra.isGuest ?? false } });
}
async function makePro(businessName: string, verificationStatus: VerificationStatus = VerificationStatus.UNVERIFIED) {
  const user = await makeUser(UserRole.PROFESSIONAL, { name: businessName });
  const pro = await prisma.professional.create({ data: { userId: user.id, businessName, postcode: "L1 2AB", serviceAreaPrefixes: ["L"], verificationStatus, services: { create: [{ projectType: "kitchen" }] } } });
  return { user, pro };
}
function form(entries: [string, string][]) {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}
async function readyProject(projectId: string) {
  const def = getProjectTypeDefinition("kitchen")!;
  const data = Object.fromEntries(def.fields.filter((f) => f.required).map((f) => [f.key, "x"]));
  await prisma.projectRequirements.upsert({ where: { projectId }, create: { projectId, data }, update: { data } });
  await prisma.project.update({ where: { id: projectId }, data: { status: ProjectStatus.DESIGN_READY, postcode: "L1 2AB" } });
}

run("Private Client Pipeline", () => {
  beforeEach(() => {
    state.currentUser = null;
    state.jar.clear();
  });

  it("mints unique, stable referral codes and resolves them (rejected pros never resolve)", async () => {
    const a = await makePro("Alpha Kitchens");
    const b = await makePro("Bravo Kitchens");
    const ca = await ensureReferralCodes(a.pro);
    const cb = await ensureReferralCodes(b.pro);
    expect(ca.referralCode).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
    expect(ca.referralCode).not.toBe(cb.referralCode);
    expect(await ensureReferralCodes({ ...a.pro, ...ca })).toEqual(ca);
    expect((await findReferrerByCode(ca.referralCode.toLowerCase()))?.id).toBe(a.pro.id);
    expect((await findReferrerBySlug(ca.vanQrSlug))?.id).toBe(a.pro.id);
    expect(await findReferrerByCode("ZZZZZZZZ")).toBeNull();
    expect(await findReferrerByCode("not-a-code")).toBeNull();

    const rejected = await makePro("Rejected Ltd", VerificationStatus.REJECTED);
    const cr = await ensureReferralCodes(rejected.pro);
    expect(await findReferrerByCode(cr.referralCode)).toBeNull();
    expect(await findReferrerBySlug(cr.vanQrSlug)).toBeNull();
  });

  it("locks a new project to the referring contractor, once, and only when the cookie is valid", async () => {
    const a = await makePro("Lock Co");
    const { referralCode } = await ensureReferralCodes(a.pro);
    const guest = await makeUser(UserRole.HOMEOWNER, { isGuest: true });

    state.jar.set(PRO_REF_COOKIE, referralCode);
    const p1 = await getOrCreateDraftProject(guest.id, "kitchen", "Kitchen redesign");
    expect(p1.isPrivatePipeline).toBe(true);
    const again = await getOrCreateDraftProject(guest.id, "kitchen", "Kitchen redesign");
    expect(again.id).toBe(p1.id);
    expect(await prisma.privatePipelineSession.count({ where: { projectId: p1.id } })).toBe(1);
    const session = await prisma.privatePipelineSession.findUniqueOrThrow({ where: { projectId: p1.id } });
    expect(session).toMatchObject({ professionalId: a.pro.id, homeownerId: guest.id, lockStatus: "ACTIVE" });

    // No cookie -> an ordinary open project.
    state.jar.clear();
    const other = await makeUser(UserRole.HOMEOWNER, { isGuest: true });
    const open = await getOrCreateDraftProject(other.id, "kitchen", "Kitchen redesign");
    expect(open.isPrivatePipeline).toBe(false);

    // Cookie for a rejected contractor -> not locked.
    const rej = await makePro("Rejected Co", VerificationStatus.REJECTED);
    state.jar.set(PRO_REF_COOKIE, (await ensureReferralCodes(rej.pro)).referralCode);
    const third = await makeUser(UserRole.HOMEOWNER, { isGuest: true });
    expect((await getOrCreateDraftProject(third.id, "kitchen", "Kitchen redesign")).isPrivatePipeline).toBe(false);

    // A project already live on the market is never silently pulled into a private pipeline.
    state.jar.set(PRO_REF_COOKIE, referralCode);
    const live = await prisma.project.create({ data: { homeownerId: third.id, projectType: "bathroom", title: "Live", postcode: "L1", status: ProjectStatus.REQUESTING_QUOTES } });
    const { lockProjectToReferrer } = await import("@/lib/data/private-pipeline");
    expect(await lockProjectToReferrer(live.id, third.id)).toBe(false);
  });

  it("keeps a private project off every marketplace path, enforced server-side", async () => {
    const a = await makePro("Gate Co");
    const rival = await makePro("Rival Co");
    const { referralCode } = await ensureReferralCodes(a.pro);
    const home = await makeUser(UserRole.HOMEOWNER);
    state.jar.set(PRO_REF_COOKIE, referralCode);
    const priv = await getOrCreateDraftProject(home.id, "kitchen", "Private kitchen");
    state.jar.clear();
    // A control: an ordinary open kitchen project from a different homeowner, which the rival *should* see.
    const home2 = await makeUser(UserRole.HOMEOWNER);
    const openProj = await getOrCreateDraftProject(home2.id, "kitchen", "Open kitchen");
    expect(openProj.isPrivatePipeline).toBe(false);
    await readyProject(priv.id);

    // 1. pushToOpenMarket refuses and changes nothing.
    state.currentUser = home;
    expect(await pushToOpenMarket(priv.id)).toEqual({ error: expect.stringContaining("private design portal") });
    expect((await prisma.project.findUniqueOrThrow({ where: { id: priv.id } })).status).toBe(ProjectStatus.DESIGN_READY);

    // 2. Even if it somehow reached the market status, a rival can't quote on it...
    await prisma.project.update({ where: { id: priv.id }, data: { status: ProjectStatus.REQUESTING_QUOTES } });
    state.currentUser = rival.user;
    expect(await submitOpenMarketQuote(priv.id, undefined, form([["quoteAmount", "1000"], ["quoteTimeline", "1 week"]]))).toEqual({ error: "This project isn't open for quotes." });
    expect(await prisma.quoteRequest.count({ where: { projectId: priv.id } })).toBe(0);

    // 3. ...and it never appears in the rival's browse list, while a matching open project does.
    await prisma.project.update({ where: { id: openProj.id }, data: { status: ProjectStatus.REQUESTING_QUOTES, postcode: "L1 2AB" } });
    await prisma.project.update({ where: { id: priv.id }, data: { postcode: "L1 2AB" } });
    const browse = await getOpenMarketProjects();
    expect(browse.map((p) => p.id)).toContain(openProj.id);
    expect(browse.map((p) => p.id)).not.toContain(priv.id);
    const raw = await prisma.project.findMany({ where: { id: { in: [priv.id, openProj.id] }, ...notPrivatePipelineWhere() } });
    expect(raw.map((p) => p.id)).toEqual([openProj.id]);
  });

  it("runs the full private flow: estimate request -> itemised quote + deposit -> accept, free as the contractor's first private job", async () => {
    const a = await makePro("Flow Co");
    const rival = await makePro("Rival Flow Co");
    const { referralCode } = await ensureReferralCodes(a.pro);
    const home = await makeUser(UserRole.HOMEOWNER, { name: "Hannah Homeowner" });
    state.jar.set(PRO_REF_COOKIE, referralCode);
    const project = await getOrCreateDraftProject(home.id, "kitchen", "Private kitchen");
    state.jar.clear();
    await prisma.project.update({ where: { id: project.id }, data: { postcode: "L1 2AB" } });
    const session = await prisma.privatePipelineSession.findUniqueOrThrow({ where: { projectId: project.id } });

    // Contractor sees the lead before any request, with identity withheld.
    const before = (await listPrivateLeads(a.pro.id)).find((l) => l.projectId === project.id)!;
    expect(before.clientLabel).toBe("Client (still designing)");
    expect(before.postcode).toBe("L1");

    // Can't quote before the client asks.
    state.currentUser = a.user;
    expect(await submitPrivateQuote(session.id, undefined, form([["itemDescription", "Fit"], ["itemAmount", "100"], ["quoteTimeline", "1w"]]))).toEqual({ error: "The client hasn't requested an estimate yet." });

    // Client can't send until the design/brief is ready, then can.
    state.currentUser = home;
    expect(await requestPrivateEstimate(project.id)).toEqual({ error: expect.any(String) });
    await readyProject(project.id);
    expect(await requestPrivateEstimate(project.id)).toBeUndefined();
    expect(await requestPrivateEstimate(project.id)).toBeUndefined(); // idempotent
    const qrs = await prisma.quoteRequest.findMany({ where: { projectId: project.id } });
    expect(qrs).toHaveLength(1);
    expect(qrs[0]).toMatchObject({ professionalId: a.pro.id, status: QuoteRequestStatus.PENDING });
    expect((await prisma.privatePipelineSession.findUniqueOrThrow({ where: { id: session.id } })).estimateRequestedAt).not.toBeNull();
    expect((await listPrivateLeads(a.pro.id)).find((l) => l.projectId === project.id)!.clientLabel).toBe("Hannah Homeowner");

    // A different contractor can't touch this lead.
    state.currentUser = rival.user;
    expect(await submitPrivateQuote(session.id, undefined, form([["itemDescription", "Fit"], ["itemAmount", "1"], ["quoteTimeline", "1w"]]))).toEqual({ error: "This lead isn't available." });

    // Validation: deposit may not exceed the total.
    state.currentUser = a.user;
    const items: [string, string][] = [["itemDescription", "Units"], ["itemAmount", "1200"], ["itemDescription", "Fitting"], ["itemAmount", "350.50"], ["quoteTimeline", "2 weeks"]];
    expect(await submitPrivateQuote(session.id, undefined, form([...items, ["deposit", "9999"]]))).toEqual({ error: expect.stringContaining("deposit") });

    // Itemised quote with deposit.
    expect(await submitPrivateQuote(session.id, undefined, form([...items, ["deposit", "500"], ["quoteNotes", "Prices include VAT"]]))).toBeUndefined();
    const quoted = await prisma.quoteRequest.findUniqueOrThrow({ where: { id: qrs[0].id } });
    expect(quoted).toMatchObject({ status: "QUOTED", quoteAmount: 155050, depositAmount: 50000, quoteTimeline: "2 weeks" });
    expect(quoted.quoteLineItems).toEqual([{ description: "Units", amountPence: 120000 }, { description: "Fitting", amountPence: 35050 }]);
    expect(quoted.depositRequestedAt).not.toBeNull();
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe(ProjectStatus.QUOTES_RECEIVED);

    // Deposit can only be marked received by the owning contractor.
    state.currentUser = rival.user;
    await markDepositReceived(quoted.id);
    expect((await prisma.quoteRequest.findUniqueOrThrow({ where: { id: quoted.id } })).depositReceivedAt).toBeNull();
    state.currentUser = a.user;
    await markDepositReceived(quoted.id);
    expect((await prisma.quoteRequest.findUniqueOrThrow({ where: { id: quoted.id } })).depositReceivedAt).not.toBeNull();

    // Client accepts: a contractor's first private job is free — a £0, already-PAID Transaction — so the full postcode unlocks straight away.
    state.currentUser = home;
    await selectProfessional(project.id, quoted.id);
    expect((await prisma.quoteRequest.findUniqueOrThrow({ where: { id: quoted.id } })).selected).toBe(true);
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe(ProjectStatus.PROFESSIONAL_SELECTED);
    expect(await prisma.transaction.findUniqueOrThrow({ where: { quoteRequestId: quoted.id } })).toMatchObject({ feeAmount: 0, status: "PAID" });
    state.currentUser = a.user;
    expect((await getProfessionalQuotes()).find((q) => q.projectId === project.id)!.project.postcode).toBe("L1 2AB");

    // Once accepted, the quote is fixed.
    expect(await submitPrivateQuote(session.id, undefined, form(items))).toEqual({ error: "The client has already accepted this quote." });
  });

  it("charges 1% from a contractor's fourth private-link job and holds the address until it is paid", async () => {
    const a = await makePro("Fee Co");
    const { referralCode } = await ensureReferralCodes(a.pro);

    async function privateJob(n: number, amountPounds: string) {
      const home = await makeUser(UserRole.HOMEOWNER, { name: `Client ${n}` });
      state.jar.set(PRO_REF_COOKIE, referralCode);
      const project = await getOrCreateDraftProject(home.id, "kitchen", `Private kitchen ${n}`);
      state.jar.clear();
      await readyProject(project.id);
      const session = await prisma.privatePipelineSession.findUniqueOrThrow({ where: { projectId: project.id } });
      state.currentUser = home;
      await requestPrivateEstimate(project.id);
      state.currentUser = a.user;
      await submitPrivateQuote(session.id, undefined, form([["itemDescription", "Job"], ["itemAmount", amountPounds], ["quoteTimeline", "1 week"]]));
      const qr = await prisma.quoteRequest.findFirstOrThrow({ where: { projectId: project.id } });
      state.currentUser = home;
      await selectProfessional(project.id, qr.id);
      return { project, qr };
    }

    // Jobs 1-3: free, address unlocked at once.
    for (let n = 1; n <= 3; n++) {
      const { qr, project } = await privateJob(n, "2450");
      expect(await prisma.transaction.findUniqueOrThrow({ where: { quoteRequestId: qr.id } })).toMatchObject({ feeAmount: 0, status: "PAID" });
      state.currentUser = a.user;
      expect((await getProfessionalQuotes()).find((q) => q.projectId === project.id)!.project.postcode).toBe("L1 2AB");
    }

    // Job 4: 1% of £2,450 = £24.50, PENDING, address held back (outward code only) until paid.
    const four = await privateJob(4, "2450");
    expect(await prisma.transaction.findUniqueOrThrow({ where: { quoteRequestId: four.qr.id } })).toMatchObject({ feeAmount: 2450, status: "PENDING" });
    state.currentUser = a.user;
    expect((await getProfessionalQuotes()).find((q) => q.projectId === four.project.id)!.project.postcode).toBe("L1");

    // Paying unlocks it.
    await prisma.transaction.update({ where: { quoteRequestId: four.qr.id }, data: { status: "PAID", paidAt: new Date() } });
    expect((await getProfessionalQuotes()).find((q) => q.projectId === four.project.id)!.project.postcode).toBe("L1 2AB");

    // A fifth job over £25,000 is capped at £250, not 1% of the quote.
    const five = await privateJob(5, "40000");
    expect(await prisma.transaction.findUniqueOrThrow({ where: { quoteRequestId: five.qr.id } })).toMatchObject({ feeAmount: 25000, status: "PENDING" });

    // A fee that auto-cancelled unpaid does not count towards the three free jobs.
    await prisma.transaction.update({ where: { quoteRequestId: five.qr.id }, data: { status: "CANCELLED" } });
    expect(await countPriorPrivateLinkJobs(a.pro.id, randomUUID())).toBe(4);
  });

  it("early-bird: a pro who signed up before Black Friday 2026 pays no commission on their first two marketplace jobs", async () => {
    const early = await makePro("Early Bird Co");
    const late = await makePro("Late Joiner Co");
    // Account created on/after Black Friday 2026 (Fri 27 Nov) -> not eligible.
    await prisma.user.update({ where: { id: late.user.id }, data: { createdAt: new Date("2026-12-01T09:00:00Z") } });

    async function marketplaceJob(pro: { pro: { id: string } }, n: number, amountPence: number) {
      const home = await makeUser(UserRole.HOMEOWNER, { name: `Market client ${n}` });
      const project = await getOrCreateDraftProject(home.id, "kitchen", `Market kitchen ${n}`);
      await prisma.project.update({ where: { id: project.id }, data: { status: ProjectStatus.REQUESTING_QUOTES, postcode: "L1 2AB" } });
      const qr = await prisma.quoteRequest.create({
        data: { projectId: project.id, homeownerId: home.id, professionalId: pro.pro.id, status: QuoteRequestStatus.QUOTED, quoteAmount: amountPence, quoteTimeline: "2 weeks" },
      });
      state.currentUser = home;
      await selectProfessional(project.id, qr.id);
      return { project, qr };
    }

    // Early bird: jobs 1 and 2 free (PAID £0, address unlocked), job 3 is the normal 5%, held until paid.
    for (let n = 1; n <= 2; n++) {
      const { qr, project } = await marketplaceJob(early, n, 420000);
      expect(await prisma.transaction.findUniqueOrThrow({ where: { quoteRequestId: qr.id } })).toMatchObject({ feeAmount: 0, status: "PAID" });
      state.currentUser = early.user;
      expect((await getProfessionalQuotes()).find((q) => q.projectId === project.id)!.project.postcode).toBe("L1 2AB");
    }
    const third = await marketplaceJob(early, 3, 420000);
    expect(await prisma.transaction.findUniqueOrThrow({ where: { quoteRequestId: third.qr.id } })).toMatchObject({ feeAmount: 21000, status: "PENDING" });
    state.currentUser = early.user;
    expect((await getProfessionalQuotes()).find((q) => q.projectId === third.project.id)!.project.postcode).toBe("L1");

    // Someone who signed up after the cutoff pays 5% from their first job.
    const lateJob = await marketplaceJob(late, 4, 420000);
    expect(await prisma.transaction.findUniqueOrThrow({ where: { quoteRequestId: lateJob.qr.id } })).toMatchObject({ feeAmount: 21000, status: "PENDING" });
  });

  it("keeps the lock when an anonymous guest signs up", async () => {
    const a = await makePro("Merge Co");
    const { referralCode } = await ensureReferralCodes(a.pro);
    const guest = await makeUser(UserRole.HOMEOWNER, { isGuest: true });
    state.jar.set(PRO_REF_COOKIE, referralCode);
    const project = await getOrCreateDraftProject(guest.id, "kitchen", "Kitchen");
    const real = await makeUser(UserRole.HOMEOWNER, { name: "Real Person" });

    state.jar.set(GUEST_COOKIE, guest.id);
    await mergeGuestIntoUser(real.id);

    const session = await prisma.privatePipelineSession.findUniqueOrThrow({ where: { projectId: project.id } });
    expect(session).toMatchObject({ homeownerId: real.id, lockStatus: "ACTIVE" });
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).homeownerId).toBe(real.id);
    expect(await prisma.user.findUnique({ where: { id: guest.id } })).toBeNull();
  });
});
