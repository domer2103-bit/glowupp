import "server-only";
import { prisma } from "@/lib/prisma";
import { runDesignGeneration } from "@/lib/design-generation";
import { DesignConceptStatus } from "@/generated/prisma/client";

/** What one generated concept needs: which photo, how to generate it, and how to label it. */
export interface ConceptSpec {
  sourcePhotoId: string;
  mode: "generate" | "regenerate" | "edit";
  sourceStoragePath: string;
  /** An approved design this generation should match — see runDesignGeneration. */
  referenceStoragePath?: string;
  prompt: string;
  styleKey?: string;
  description?: string;
}

export interface ReservedConcept {
  id: string;
  spec: ConceptSpec;
}

/** How many images are generated at once for one batch. Each is an independent provider task; a small cap keeps a full batch quick without flooding the provider. */
const CONCURRENCY = 3;

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}

/**
 * Step 1 of every generation: create all the rows up front — one transaction,
 * consecutive version numbers, status PROCESSING — so the page can show them
 * as "Generating…" straight away.
 *
 * It is also the duplicate guard. (projectId, version) is unique, so if two
 * requests race (a double click, or a browser silently retrying a POST whose
 * connection dropped), both compute the same next version and exactly one
 * transaction can win; the loser gets `null` and must do nothing — the
 * winner's rows are already on their way. Versions are never skipped or
 * reused, and nothing is overwritten.
 */
export async function reserveConcepts(projectId: string, specs: ConceptSpec[]): Promise<ReservedConcept[] | null> {
  if (specs.length === 0) return [];
  try {
    return await prisma.$transaction(async (tx) => {
      const last = await tx.designConcept.aggregate({ where: { projectId }, _max: { version: true } });
      let version = last._max.version ?? 0;
      const reserved: ReservedConcept[] = [];
      for (const spec of specs) {
        version += 1;
        const row = await tx.designConcept.create({
          data: {
            projectId,
            sourcePhotoId: spec.sourcePhotoId,
            generationPrompt: spec.prompt,
            description: spec.description,
            styleKey: spec.styleKey,
            version,
            status: DesignConceptStatus.PROCESSING,
            provider: "kie.ai",
            model: "pending",
          },
        });
        reserved.push({ id: row.id, spec });
      }
      return reserved;
    });
  } catch (err) {
    if (isUniqueViolation(err)) return null;
    throw err;
  }
}

async function runOne(projectId: string, actorId: string, { id, spec }: ReservedConcept): Promise<void> {
  try {
    const result = await runDesignGeneration({
      projectId,
      mode: spec.mode,
      sourceStoragePath: spec.sourceStoragePath,
      prompt: spec.prompt,
      referenceStoragePath: spec.referenceStoragePath,
    });
    await prisma.designConcept.update({
      where: { id },
      data: { status: DesignConceptStatus.COMPLETE, storagePath: result.storagePath, provider: result.provider, model: result.model },
    });
    await prisma.activityLog.create({ data: { type: "design_generated", actorId, projectId, metadata: { designConceptId: id } } });
  } catch (err) {
    console.error("Design generation failed:", err);
    try {
      await prisma.designConcept.update({
        where: { id },
        data: { status: DesignConceptStatus.FAILED, errorMessage: err instanceof Error ? err.message : "Unknown error" },
      });
    } catch (updateErr) {
      // If even this write fails the row is left "generating"; failStaleConcepts() will clear it.
      console.error("Could not record a failed design generation:", updateErr);
    }
  }
}

/**
 * Step 2: do the slow part. Called from `after()` so the request that started
 * it has already returned; a failed image is recorded on its own row and
 * never affects the others.
 */
export async function runReservedConcepts(projectId: string, actorId: string, reserved: ReservedConcept[]): Promise<void> {
  const queue = [...reserved];
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) await runOne(projectId, actorId, next);
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
}
