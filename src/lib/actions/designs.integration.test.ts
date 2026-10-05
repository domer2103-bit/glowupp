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
    /** Work scheduled with after() — the real thing runs it once the response is sent; here the tests flush it explicitly. */
    pending: [] as (() => Promise<unknown>)[],
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: (fn: () => Promise<unknown>) => state.pending.push(fn) }));
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
import { generateDesignBatch, generateRemainingPhotos } from "@/lib/actions/designs";
import { failStaleConcepts } from "@/lib/design-stale";
import { DesignConceptStatus, UserRole } from "@/generated/prisma/client";

const run = process.env.DESIGNS_TEST_DB ? describe : describe.skip;

/** Runs an action, then lets the background generation it scheduled finish — what happens after the real response is sent. */
async function go<T>(action: () => Promise<T>): Promise<T> {
  const result = await action();
  await flush();
  return result;
}

/** Runs the scheduled background work (the real after() starts it once the response has gone out). */
async function flush() {
  await Promise.all(state.pending.splice(0).map((fn) => fn()));
}

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
    state.pending = [];
  });

  it("refuses until a style has been chosen", async () => {
    const { project } = await seed(2);
    await prisma.designConcept.updateMany({ where: { projectId: project.id }, data: { selectedByUser: false } });
    expect(await go(() => generateRemainingPhotos(project.id, undefined, new FormData()))).toEqual({ error: "Choose the style you like first." });
    expect(state.generations).toHaveLength(0);
  });

  it("designs each other photo in the chosen style, using the chosen design as the reference", async () => {
    const { project, photos } = await seed(3);
    expect(await go(() => generateRemainingPhotos(project.id, undefined, new FormData()))).toBeUndefined();

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
    await go(() => generateRemainingPhotos(project.id, undefined, new FormData()));
    state.generations = [];
    expect(await go(() => generateRemainingPhotos(project.id, undefined, new FormData()))).toEqual({ error: "All your photos already have a design in this style." });
    expect(state.generations).toHaveLength(0);
  });

  it("retries a photo whose earlier attempt failed, and only that one", async () => {
    const { project, photos } = await seed(3);
    state.failNext = true;
    await go(() => generateRemainingPhotos(project.id, undefined, new FormData())); // photo 1 fails, photo 2 succeeds
    const failed = await prisma.designConcept.findFirstOrThrow({ where: { projectId: project.id, sourcePhotoId: photos[1].id } });
    expect(failed.status).toBe(DesignConceptStatus.FAILED);

    // Failed attempts stay visible and count toward the cap (cap is 5: three options + the failed one + photo 2's result), so make room for exactly one retry.
    state.generations = [];
    await prisma.designConcept.deleteMany({ where: { projectId: project.id, sourcePhotoId: photos[2].id } });
    await go(() => generateRemainingPhotos(project.id, undefined, new FormData()));
    expect(state.generations.map((g) => g.sourceStoragePath)).toEqual([photos[1].storagePath]); // the failed photo is retried first
    expect(await prisma.designConcept.count({ where: { projectId: project.id, sourcePhotoId: photos[1].id, status: DesignConceptStatus.COMPLETE } })).toBe(1);
  });

  it("falls back to the text style direction when the provider can't take a reference image", async () => {
    state.supportsReferences = false;
    const { project } = await seed(2);
    await go(() => generateRemainingPhotos(project.id, undefined, new FormData()));
    const [g] = state.generations;
    expect(g.referenceStoragePath).toBeUndefined();
    expect(g.prompt).not.toContain("STYLE REFERENCE");
    expect(g.prompt).toContain("Style direction: traditional");
  });

  it("stops at the per-project cap", async () => {
    const { project } = await seed(5); // cap is 5: three style options + room for two more
    await go(() => generateRemainingPhotos(project.id, undefined, new FormData()));
    expect(await prisma.designConcept.count({ where: { projectId: project.id } })).toBe(5);
    const again = await go(() => generateRemainingPhotos(project.id, undefined, new FormData()));
    expect(again?.error).toMatch(/limit of 5/);
  });

  it("returns before the images are made: rows exist as 'generating' straight away, and finish in the background", async () => {
    const { project } = await seed(2);
    const result = await generateRemainingPhotos(project.id, undefined, new FormData()); // no go(): nothing has run yet
    expect(result).toBeUndefined();
    expect(state.generations).toHaveLength(0);
    const rows = await prisma.designConcept.findMany({ where: { projectId: project.id, version: { gt: 3 } } });
    expect(rows.map((r) => r.status)).toEqual([DesignConceptStatus.PROCESSING]);
    await flush();
    const done = await prisma.designConcept.findMany({ where: { projectId: project.id, version: { gt: 3 } } });
    expect(done.map((r) => r.status)).toEqual([DesignConceptStatus.COMPLETE]);
  });

  it("never starts the same work twice: a second request while the first is still running is a no-op", async () => {
    const { project } = await seed(3);
    await generateRemainingPhotos(project.id, undefined, new FormData()); // first request — still generating
    const second = await generateRemainingPhotos(project.id, undefined, new FormData()); // e.g. a browser retrying the POST
    expect(second).toEqual({ error: "All your photos already have a design in this style." });
    await flush();
    expect(state.generations).toHaveLength(2); // photos 2 and 3, once each
    expect(await prisma.designConcept.count({ where: { projectId: project.id } })).toBe(5);
  });

  it("records one failed image without losing the others", async () => {
    const { project, photos } = await seed(3);
    state.failNext = true;
    await go(() => generateRemainingPhotos(project.id, undefined, new FormData()));
    const rows = await prisma.designConcept.findMany({ where: { projectId: project.id, version: { gt: 3 } }, orderBy: { version: "asc" } });
    expect(rows.map((r) => [r.sourcePhotoId, r.status])).toEqual([
      [photos[1].id, DesignConceptStatus.FAILED],
      [photos[2].id, DesignConceptStatus.COMPLETE],
    ]);
    expect(rows[0].errorMessage).toBe("provider exploded");
  });
});

run("generateDesignBatch", () => {
  beforeEach(() => {
    state.generations = [];
    state.failNext = false;
    state.pending = [];
  });

  async function seedUnstyled(photoCount = 1) {
    const { project, photos } = await seed(photoCount);
    await prisma.designConcept.deleteMany({ where: { projectId: project.id } }); // start from photos only
    return { project, photos };
  }

  it("makes one image per style, all reserved at once with consecutive versions", async () => {
    const { project, photos } = await seedUnstyled();
    expect(await generateDesignBatch(project.id, photos[0].id, undefined, new FormData())).toBeUndefined();
    const reserved = await prisma.designConcept.findMany({ where: { projectId: project.id }, orderBy: { version: "asc" } });
    expect(reserved.map((c) => [c.version, c.styleKey, c.status])).toEqual([
      [1, "contemporary", "PROCESSING"],
      [2, "traditional", "PROCESSING"],
      [3, "bold", "PROCESSING"],
    ]);
    await flush();
    expect(await prisma.designConcept.count({ where: { projectId: project.id, status: DesignConceptStatus.COMPLETE } })).toBe(3);
  });

  it("does not make a style twice for the same photo — a repeated or retried request creates nothing", async () => {
    const { project, photos } = await seedUnstyled();
    await go(() => generateDesignBatch(project.id, photos[0].id, undefined, new FormData()));
    const again = await go(() => generateDesignBatch(project.id, photos[0].id, undefined, new FormData()));
    expect(again).toEqual({ error: "Designs for this photo are already made or on their way." });
    expect(await prisma.designConcept.count({ where: { projectId: project.id } })).toBe(3);
  });

  it("only fills in the styles that are missing, and retries failed ones", async () => {
    const { project, photos } = await seedUnstyled();
    await prisma.designConcept.create({
      data: { projectId: project.id, sourcePhotoId: photos[0].id, generationPrompt: "x", styleKey: "contemporary", version: 1, status: DesignConceptStatus.COMPLETE, storagePath: "d/1.png", provider: "t", model: "t" },
    });
    await prisma.designConcept.create({
      data: { projectId: project.id, sourcePhotoId: photos[0].id, generationPrompt: "x", styleKey: "traditional", version: 2, status: DesignConceptStatus.FAILED, provider: "t", model: "t" },
    });
    await go(() => generateDesignBatch(project.id, photos[0].id, undefined, new FormData()));
    const created = await prisma.designConcept.findMany({ where: { projectId: project.id, version: { gt: 2 } }, orderBy: { version: "asc" } });
    expect(created.map((c) => [c.version, c.styleKey])).toEqual([
      [3, "traditional"],
      [4, "bold"],
    ]);
  });
});

run("failStaleConcepts", () => {
  it("fails concepts stuck generating for too long, and leaves recent and finished ones alone", async () => {
    const { project, photos } = await seed(1);
    const old = new Date(Date.now() - 11 * 60 * 1000);
    const base = { projectId: project.id, sourcePhotoId: photos[0].id, generationPrompt: "x", provider: "t", model: "t" };
    const stuck = await prisma.designConcept.create({ data: { ...base, version: 10, status: DesignConceptStatus.PROCESSING, createdAt: old } });
    const recent = await prisma.designConcept.create({ data: { ...base, version: 11, status: DesignConceptStatus.PROCESSING } });
    const finished = await prisma.designConcept.create({ data: { ...base, version: 12, status: DesignConceptStatus.COMPLETE, storagePath: "d/x.png", createdAt: old } });

    expect(await failStaleConcepts(project.id)).toBe(1);
    const status = async (id: string) => (await prisma.designConcept.findUniqueOrThrow({ where: { id } })).status;
    expect(await status(stuck.id)).toBe(DesignConceptStatus.FAILED);
    expect(await status(recent.id)).toBe(DesignConceptStatus.PROCESSING);
    expect(await status(finished.id)).toBe(DesignConceptStatus.COMPLETE);
    expect((await prisma.designConcept.findUniqueOrThrow({ where: { id: stuck.id } })).errorMessage).toMatch(/interrupted/);
  });
});
