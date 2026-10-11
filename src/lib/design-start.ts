import "server-only";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { buildDesignPrompt } from "@/lib/design-generation";
import { reserveConcepts, runReservedConcepts, type ConceptSpec } from "@/lib/design-jobs";
import { GENERATION_LIMITS } from "@/lib/generation-limits";
import { getDesignStyle } from "@/lib/design-styles";
import { REFINEMENT_PREFIX } from "@/lib/design-selection";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { DesignConceptStatus, type Project } from "@/generated/prisma/client";

/**
 * Shared by every generation path (batch, more styles, other photos, regenerate, change).
 * Reserves the rows first (which is also the duplicate guard — see
 * reserveConcepts), then runs the slow image generation in the background so
 * the request returns immediately instead of holding a connection open for
 * minutes; the project page shows "Generating…" and refreshes itself.
 *
 * Returns false if another request got there first, in which case this one
 * must do nothing.
 */
export async function startGeneration(projectId: string, actorId: string, specs: ConceptSpec[]): Promise<boolean> {
  const reserved = await reserveConcepts(projectId, specs);
  if (reserved === null) return false;
  after(() =>
    runReservedConcepts(projectId, actorId, reserved).catch((err) => {
      console.error("Background design generation crashed:", err);
    })
  );
  revalidatePath(`/projects/${projectId}`);
  return true;
}

/**
 * Edits one completed design from a homeowner's instruction ("make the worktop darker").
 * If the design being edited is the one they chose, the edited version becomes their chosen
 * design as soon as it is ready (the earlier version stays available to go back to).
 * Returns an error message, or undefined once the change has been started.
 */
export async function applyDesignChange(project: Pick<Project, "id" | "homeownerId" | "projectType" | "title" | "description">, conceptId: string, changeRequest: string): Promise<{ error: string } | undefined> {
  const change = changeRequest.trim();
  if (!change) return { error: "Describe the change you'd like first." };

  const source = await prisma.designConcept.findUnique({ where: { id: conceptId } });
  if (!source || source.projectId !== project.id) return { error: "That design could not be found on this project." };
  if (source.status !== DesignConceptStatus.COMPLETE || !source.storagePath) return { error: "That design isn't ready to be changed yet." };

  const concepts = await prisma.designConcept.findMany({ where: { projectId: project.id }, select: { status: true } });
  if (concepts.some((c) => c.status === DesignConceptStatus.PENDING || c.status === DesignConceptStatus.PROCESSING)) {
    return { error: "Your design is still being updated — give it a minute to finish, then ask for the next change." };
  }
  if (concepts.length >= GENERATION_LIMITS.maxPerProject) {
    return { error: `This project has reached its limit of ${GENERATION_LIMITS.maxPerProject} generated designs.` };
  }

  const definition = getProjectTypeDefinition(project.projectType);
  if (!definition) return { error: "This project's type is no longer recognized." };

  // Generation spends real AI-provider money and a guest has no account-level limit, so it has a floor keyed by IP.
  const ip = await getClientIp();
  if (!checkRateLimit(`guest-generate:${ip}`, 8, 60 * 60 * 1000)) {
    return { error: "You've generated a lot of designs recently — please try again in a while." };
  }

  const requirements = await prisma.projectRequirements.findUnique({ where: { projectId: project.id } });
  const requirementsData = (requirements?.data as Record<string, unknown>) ?? {};
  const style = source.styleKey ? getDesignStyle(source.styleKey) : undefined;
  const prompt = buildDesignPrompt(project, definition, requirementsData, { styleModifier: style?.promptModifier, changeRequest: change });

  const started = await startGeneration(project.id, project.homeownerId, [
    {
      sourcePhotoId: source.sourcePhotoId,
      mode: "edit",
      sourceStoragePath: source.storagePath,
      prompt,
      styleKey: source.styleKey ?? undefined,
      description: `${REFINEMENT_PREFIX} v${source.version}: ${change}`,
      replacesConceptId: source.selectedByUser ? source.id : undefined,
    },
  ]);
  return started ? undefined : { error: "That change is already being made." };
}
