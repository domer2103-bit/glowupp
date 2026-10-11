/**
 * Integration test for sending a project to the open market: the postcode is collected at that
 * moment (the guided redesign doesn't ask for one) and is what tradespeople are matched on.
 * Needs a scratch Postgres, so it is skipped unless DESIGNS_TEST_DB is set:
 *
 *   DESIGNS_TEST_DB=1 DATABASE_URL=postgres://... pnpm vitest run push-to-market.integration
 */
import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const sent = vi.hoisted(() => ({ emails: [] as { professionalEmail: string; postcode: string }[] }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  return { prisma: new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }) }) };
});
vi.mock("@/lib/data/projects", async () => {
  const { prisma } = await import("@/lib/prisma");
  return { requireProjectOwner: async (id: string) => prisma.project.findUniqueOrThrow({ where: { id } }) };
});
vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/notifications", () => ({
  notifyOpenMarketProject: async (args: { professionalEmail: string; postcode: string }) => void sent.emails.push(args),
  notifyProfessionalSelected: vi.fn(),
  notifyQuoteSubmitted: vi.fn(),
}));
vi.mock("@/lib/storage", () => ({ getSignedPhotoUrl: async () => null }));
vi.mock("@/lib/data/affiliates", () => ({ settleFreeJobForAffiliate: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { pushToOpenMarket } from "@/lib/actions/quotes";
import { ProjectStatus, UserRole } from "@/generated/prisma/client";

const run = process.env.DESIGNS_TEST_DB ? describe : describe.skip;

async function seedProject(postcode: string) {
  const userId = randomUUID();
  await prisma.user.create({ data: { id: userId, role: UserRole.HOMEOWNER, name: "H", email: `${userId}@test.local` } });
  const project = await prisma.project.create({ data: { homeownerId: userId, projectType: "kitchen", title: "Kitchen redesign", postcode, status: ProjectStatus.DESIGN_READY } });
  await prisma.projectRequirements.create({ data: { projectId: project.id, data: { desiredStyle: "modern" } } });
  return project;
}

function form(postcode: string) {
  const fd = new FormData();
  fd.set("postcode", postcode);
  return fd;
}

run("pushToOpenMarket postcode", () => {
  it("asks for a postcode when the project has none", async () => {
    const project = await seedProject("");
    expect(await pushToOpenMarket(project.id, undefined, new FormData())).toEqual({ error: "Enter your postcode so we can find tradespeople near you." });
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe(ProjectStatus.DESIGN_READY);
  });

  it("rejects something that isn't a postcode", async () => {
    const project = await seedProject("");
    expect(await pushToOpenMarket(project.id, undefined, form("hello"))).toEqual({ error: "Enter a valid UK postcode, for example L18 5NF." });
  });

  it("saves the tidied-up postcode, opens the project to quotes, and matches tradespeople on it", async () => {
    const proUserId = randomUUID();
    await prisma.user.create({ data: { id: proUserId, role: UserRole.PROFESSIONAL, name: "Pro", email: `${proUserId}@test.local` } });
    await prisma.professional.create({
      data: { userId: proUserId, businessName: "Kitchens Ltd", postcode: "L1 1AA", serviceAreaPrefixes: ["L18"], services: { create: [{ projectType: "kitchen" }] } },
    });
    sent.emails = [];

    const project = await seedProject("");
    expect(await pushToOpenMarket(project.id, undefined, form("l185nf"))).toBeUndefined();

    const saved = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(saved.postcode).toBe("L18 5NF");
    expect(saved.status).toBe(ProjectStatus.REQUESTING_QUOTES);
    expect(sent.emails.map((e) => [e.professionalEmail, e.postcode])).toContainEqual([`${proUserId}@test.local`, "L18 5NF"]);
  });

  it("goes straight through when the project already has a postcode", async () => {
    const project = await seedProject("M1 1AE");
    expect(await pushToOpenMarket(project.id, undefined, new FormData())).toBeUndefined();
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe(ProjectStatus.REQUESTING_QUOTES);
  });
});
