/**
 * Integration tests for "design my other photos in the chosen style" —
 * they run against a real Postgres, so they're skipped unless
 * DESIGNS_TEST_DB is set (and DATABASE_URL points at a scratch database with
 * the schema loaded — never production). The AI provider, storage and Next
 * are mocked; Prisma and the app's own logic are real.
 *
 *   DESIGNS_TEST_DB=1 DATABASE_URL=postgres://... pnpm vitest run designs.integration
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const state = vi.hoisted(() => {
  process.env.MAX_DESIGN_GENERATIONS_PER_PROJECT = "5";
  return {
    supportsReferences: true,
    generations: [] as { sourceStoragePath: string; referenceStoragePath?: string; prompt: string }[],
    failNext: false,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` }) }));
vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  return { prisma: new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }) }) };
});
vi.mock("@/lib/data/projects", async () => {
  const { prisma } = await import("@/lib/prisma");
  return { requireProjectOwnerOrGuest: async (id: string) => prisma.project.findUniqueOrThrow({ where: { id } }) };
});
vi.mock("@/lib/storage", () => ({ getSignedPhotoUrl: async () => "https://signed.test/x.jpg", uploadGeneratedDesign: async () => ({ storagePath: "out/x.png" }) }));
vi.mock("@/lib/image-providers", () => ({ getImageProvider: () => ({ supportsReferenceImages: state.supportsReferences }) }));
vi.mock("@/lib/design-generation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/design-generation")>();
  return {
    ...actual,
    runDesignGeneration: async (params: { sourceStoragePath: string; referenceStoragePath?: string; prompt: string }) => {
      state.generations.push({ sourceStoragePath: params.sourceStoragePath, referenceStoragePath: params.referenceStoragePath, prompt: params.prompt });
      if (state.failNext) {
        state.failNext = false;
        throw new Error("provider exploded");
      }
      return { storagePath: `out/${randomUUID()}.png`, provider: "test", model: "test-model" };
    },
  };
});

import { prisma } from "@/lib/prisma";
import { generateRemainingPhotos } from "@/lib/actions/designs";
import { DesignConceptStatus, UserRole } from "@/generated/prisma/client";

const run = process.env.DESIGNS_TEST_DB ? describe : describe.skip;

/** A living-room project with `photoCount` photos and a batch of three style options generated from the first photo, "traditional" chosen. */
async function seed(photoCount: number) {
  const userId = randomUUID();
  await prisma.user.create({ data: { id: userId, role: UserRole.HOMEOWNER, name: "H", email: `${userId}@test.local` } });
  const project = await prisma.project.create({ data: { homeownerId: userId, projectType: "living-room", title: "Living room redesign", postcode: "L1 2AB" } });
  const photos = [];
  for (let i = 0; i < photoCount; i++) {
    photos.push(await prisma.projectPhoto.create({ data: { projectId: project.id, storagePath: `photos/${project.id}-${i}.jpg`, uploadOrder: i } }));
  }
  const styles = ["contemporary", "traditional", "bold"];
  for (const [i, styleKey] of styles.entries()) {
    await prisma.designConcept.create({
      data: {
        projectId: project.id, sourcePhotoId: photos[0].id, generationPrompt: "x", styleKey, version: i + 1,
        status: DesignConceptStatus.COMPLETE, storagePath: `designs/${project.id}-${styleKey}.png`, provider: "test", model: "test", selectedByUser: styleKey === "traditional",
      },
    });
  }
  return { project, photos };
}

run("generateRemainingPhotos", () => {
  beforeEach(() => {
    state.supportsReferences = true;
    state.generations = [];
    state.failNext = false;
  });

  it("refuses until a style has been chosen", async () => {
    const { project } = await seed(2);
    await prisma.designConcept.updateMany({ where: { projectId: project.id }, data: { selectedByUser: false } });
    expect(await generateRemainingPhotos(project.id, undefined, new FormData())).toEqual({ error: "Choose the style you like first." });
    expect(state.generations).toHaveLength(0);
  });

  it("designs each other photo in the chosen style, using the chosen design as the reference", async () => {
    const { project, photos } = await seed(3);
    expect(await generateRemainingPhotos(project.id, undefined, new FormData())).toBeUndefined();

    expect(state.generations.map((g) => g.sourceStoragePath)).toEqual([photos[1].storagePath, photos[2].storagePath]);
    for (const g of state.generations) {
      expect(g.referenceStoragePath).toBe(`designs/${project.id}-traditional.png`);
      expect(g.prompt).toContain("STYLE REFERENCE");
      expect(g.prompt).toContain("photorealistic photo of the SAME space"); // the structure lock is on every prompt
    }
    const created = await prisma.designConcept.findMany({ where: { projectId: project.id, version: { gt: 3 } }, orderBy: { version: "asc" } });
    expect(created.map((c) => [c.version, c.sourcePhotoId, c.styleKey, c.status])).toEqual([
      [4, photos[1].id, "traditional", "COMPLETE"],
      [5, photos[2].id, "traditional", "COMPLETE"],
    ]);
    // The original choice is untouched, and nothing was deleted.
    expect((await prisma.designConcept.findMany({ where: { projectId: project.id, selectedByUser: true } })).map((c) => c.styleKey)).toEqual(["traditional"]);
    expect(await prisma.designConcept.count({ where: { projectId: project.id } })).toBe(5);
  });

  it("does nothing the second time, and tells the homeowner why", async () => {
    const { project } = await seed(2);
    await generateRemainingPhotos(project.id, undefined, new FormData());
    state.generations = [];
    expect(await generateRemainingPhotos(project.id, undefined, new FormData())).toEqual({ error: "All your photos already have a design in this style." });
    expect(state.generations).toHaveLength(0);
  });

  it("retries a photo whose earlier attempt failed, and only that one", async () => {
    const { project, photos } = await seed(3);
    state.failNext = true;
    await generateRemainingPhotos(project.id, undefined, new FormData()); // photo 1 fails, photo 2 succeeds
    const failed = await prisma.designConcept.findFirstOrThrow({ where: { projectId: project.id, sourcePhotoId: photos[1].id } });
    expect(failed.status).toBe(DesignConceptStatus.FAILED);

    // Failed attempts stay visible and count toward the cap (cap is 5: three options + the failed one + photo 2's result), so make room for exactly one retry.
    state.generations = [];
    await prisma.designConcept.deleteMany({ where: { projectId: project.id, sourcePhotoId: photos[2].id } });
    await generateRemainingPhotos(project.id, undefined, new FormData());
    expect(state.generations.map((g) => g.sourceStoragePath)).toEqual([photos[1].storagePath]); // the failed photo is retried first
    expect(await prisma.designConcept.count({ where: { projectId: project.id, sourcePhotoId: photos[1].id, status: DesignConceptStatus.COMPLETE } })).toBe(1);
  });

  it("falls back to the text style direction when the provider can't take a reference image", async () => {
    state.supportsReferences = false;
    const { project } = await seed(2);
    await generateRemainingPhotos(project.id, undefined, new FormData());
    const [g] = state.generations;
    expect(g.referenceStoragePath).toBeUndefined();
    expect(g.prompt).not.toContain("STYLE REFERENCE");
    expect(g.prompt).toContain("Style direction: traditional");
  });

  it("stops at the per-project cap", async () => {
    const { project } = await seed(5); // cap is 5: three style options + room for two more
    await generateRemainingPhotos(project.id, undefined, new FormData());
    expect(await prisma.designConcept.count({ where: { projectId: project.id } })).toBe(5);
    const again = await generateRemainingPhotos(project.id, undefined, new FormData());
    expect(again?.error).toMatch(/limit of 5/);
  });
});
