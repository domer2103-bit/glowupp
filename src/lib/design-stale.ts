import { prisma } from "@/lib/prisma";
import { DesignConceptStatus } from "@/generated/prisma/client";

/**
 * Generation runs in the background after the request that started it has
 * returned (see src/lib/design-jobs.ts), so if the server restarts mid-way
 * (a deploy, a crash) the row would stay "generating" forever — and, because
 * an in-progress concept blocks a duplicate of itself, block a retry too.
 * Anything still unfinished after this long is treated as interrupted. The
 * provider's own timeout is two minutes per image, so ten is generous even
 * for a full batch queued behind the concurrency limit.
 */
export const STALE_AFTER_MS = 10 * 60 * 1000;

/** Marks a project's long-unfinished concepts as failed so they show "Generation failed" (and can be retried) instead of spinning forever. Returns how many were changed. */
export async function failStaleConcepts(projectId: string): Promise<number> {
  const { count } = await prisma.designConcept.updateMany({
    where: {
      projectId,
      status: { in: [DesignConceptStatus.PENDING, DesignConceptStatus.PROCESSING] },
      createdAt: { lt: new Date(Date.now() - STALE_AFTER_MS) },
    },
    data: { status: DesignConceptStatus.FAILED, errorMessage: "Generation was interrupted — please try again." },
  });
  return count;
}
