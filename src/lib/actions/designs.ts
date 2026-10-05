"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectOwnerOrGuest } from "@/lib/data/projects";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { buildDesignPrompt } from "@/lib/design-generation";
import { reserveConcepts, runReservedConcepts, type ConceptSpec } from "@/lib/design-jobs";
import { GENERATION_LIMITS } from "@/lib/generation-limits";
import { DESIGN_STYLES, getDesignStyle } from "@/lib/design-styles";
import { isAtOrPastStatus } from "@/lib/project-status";
import { getChosenConcept, photosNeedingDesign } from "@/lib/design-selection";
import { getImageProvider } from "@/lib/image-providers";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { DesignConceptStatus, ProjectStatus } from "@/generated/prisma/client";

export type ActionState = { error?: string } | undefined;

/**
 * Shared by every generation path (batch, other photos, regenerate, edit).
 * Reserves the rows first (which is also the duplicate guard — see
 * reserveConcepts), then runs the slow image generation in the background so
 * the request returns immediately instead of holding a connection open for
 * minutes; the project page shows "Generating…" and refreshes itself.
 *
 * Returns false if another request got there first, in which case this one
 * must do nothing.
 */
async function startGeneration(projectId: string, actorId: string, specs: ConceptSpec[]): Promise<boolean> {
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

/** Generates one concept per configured style (src/lib/design-styles.ts), up to the initial batch size and whatever room remains under the per-project cap. */
export async function generateDesignBatch(projectId: string, photoId: string, _prevState: ActionState, _formData: FormData): Promise<ActionState> {
  const project = await requireProjectOwnerOrGuest(projectId);

  const photo = await prisma.projectPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.projectId !== projectId) return { error: "That photo could not be found on this project." };

  const definition = getProjectTypeDefinition(project.projectType);
  if (!definition) return { error: "This project's type is no longer recognized." };

  const existingCount = await prisma.designConcept.count({ where: { projectId } });
  const remaining = GENERATION_LIMITS.maxPerProject - existingCount;
  if (remaining <= 0) {
    return { error: `This project has reached its limit of ${GENERATION_LIMITS.maxPerProject} generated designs.` };
  }

  // Never make a style twice for the same photo: skip any that already exist or are in progress (failed ones are retried).
  const existingForPhoto = await prisma.designConcept.findMany({
    where: { projectId, sourcePhotoId: photoId, status: { not: DesignConceptStatus.FAILED } },
    select: { styleKey: true },
  });
  const haveStyles = new Set(existingForPhoto.map((c) => c.styleKey));
  const stylesToUse = DESIGN_STYLES.slice(0, GENERATION_LIMITS.initialBatchSize)
    .filter((s) => !haveStyles.has(s.key))
    .slice(0, remaining);
  if (stylesToUse.length === 0) return { error: "Designs for this photo are already made or on their way." };

  const requirements = await prisma.projectRequirements.findUnique({ where: { projectId } });
  const requirementsData = (requirements?.data as Record<string, unknown>) ?? {};

  const specs: ConceptSpec[] = stylesToUse.map((style) => ({
    sourcePhotoId: photoId,
    mode: "generate",
    sourceStoragePath: photo.storagePath,
    prompt: buildDesignPrompt(project, definition, requirementsData, { styleModifier: style.promptModifier }),
    styleKey: style.key,
    description: style.label,
  }));

  // false = a simultaneous request already started these; nothing more to do.
  await startGeneration(projectId, project.homeownerId, specs);
  return undefined;
}

/**
 * After the homeowner has chosen a style, designs each of their other photos
 * in that same style — same colours and materials, but each photo's own room
 * structure and angle. Where the active image model can take a second image,
 * the chosen design is passed in as a reference; otherwise the style
 * direction is applied from text alone (less exact, same pipeline).
 */
export async function generateRemainingPhotos(projectId: string, _prevState: ActionState, _formData: FormData): Promise<ActionState> {
  const project = await requireProjectOwnerOrGuest(projectId);

  const concepts = await prisma.designConcept.findMany({ where: { projectId }, orderBy: { version: "asc" } });
  const chosen = getChosenConcept(concepts);
  if (!chosen || chosen.status !== DesignConceptStatus.COMPLETE || !chosen.storagePath) {
    return { error: "Choose the style you like first." };
  }

  const photos = await prisma.projectPhoto.findMany({ where: { projectId }, orderBy: { uploadOrder: "asc" } });
  const pending = photosNeedingDesign(photos, concepts, chosen);
  if (pending.length === 0) return { error: "All your photos already have a design in this style." };

  const remaining = GENERATION_LIMITS.maxPerProject - concepts.length;
  if (remaining <= 0) {
    return { error: `This project has reached its limit of ${GENERATION_LIMITS.maxPerProject} generated designs.` };
  }
  const targets = pending.slice(0, remaining);

  const definition = getProjectTypeDefinition(project.projectType);
  if (!definition) return { error: "This project's type is no longer recognized." };

  // Same floor as the wizard: generation is the step that spends real AI-provider money, and a guest has no account-level limit.
  const ip = await getClientIp();
  if (!checkRateLimit(`guest-generate:${ip}`, 8, 60 * 60 * 1000)) {
    return { error: "You've generated a lot of designs recently — please try again in a while." };
  }

  const requirements = await prisma.projectRequirements.findUnique({ where: { projectId } });
  const requirementsData = (requirements?.data as Record<string, unknown>) ?? {};
  const style = chosen.styleKey ? getDesignStyle(chosen.styleKey) : undefined;
  const useReference = getImageProvider().supportsReferenceImages;

  const specs: ConceptSpec[] = targets.map((photo) => ({
    sourcePhotoId: photo.id,
    mode: "generate",
    sourceStoragePath: photo.storagePath,
    referenceStoragePath: useReference ? chosen.storagePath! : undefined,
    prompt: buildDesignPrompt(project, definition, requirementsData, {
      styleModifier: style?.promptModifier,
      matchApprovedDesign: useReference,
    }),
    styleKey: chosen.styleKey ?? undefined,
    description: `${style?.label ?? "Chosen style"} — matched to your chosen design`,
  }));

  await startGeneration(projectId, project.homeownerId, specs);
  return undefined;
}

/** Tries the same style again from the original photo — for when a specific generation came out poorly, not a refinement of its result. */
export async function regenerateDesignConcept(projectId: string, conceptId: string, _prevState: ActionState, _formData: FormData): Promise<ActionState> {
  const project = await requireProjectOwnerOrGuest(projectId);

  const source = await prisma.designConcept.findUnique({ where: { id: conceptId }, include: { sourcePhoto: true } });
  if (!source || source.projectId !== projectId) return { error: "That design could not be found on this project." };

  const existingCount = await prisma.designConcept.count({ where: { projectId } });
  if (existingCount >= GENERATION_LIMITS.maxPerProject) {
    return { error: `This project has reached its limit of ${GENERATION_LIMITS.maxPerProject} generated designs.` };
  }

  const definition = getProjectTypeDefinition(project.projectType);
  if (!definition) return { error: "This project's type is no longer recognized." };

  const requirements = await prisma.projectRequirements.findUnique({ where: { projectId } });
  const requirementsData = (requirements?.data as Record<string, unknown>) ?? {};
  const style = source.styleKey ? getDesignStyle(source.styleKey) : undefined;
  const prompt = buildDesignPrompt(project, definition, requirementsData, { styleModifier: style?.promptModifier });

  await startGeneration(projectId, project.homeownerId, [
    {
      sourcePhotoId: source.sourcePhotoId,
      mode: "regenerate",
      sourceStoragePath: source.sourcePhoto.storagePath,
      prompt,
      styleKey: source.styleKey ?? undefined,
      description: style?.label ?? source.description ?? undefined,
    },
  ]);
  return undefined;
}

/** Refines a specific completed concept's own image based on homeowner feedback — an edit of that result, not a fresh attempt from the original photo. */
export async function requestDesignChanges(projectId: string, conceptId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const project = await requireProjectOwnerOrGuest(projectId);

  const changeRequest = (formData.get("changeRequest") as string | null)?.trim();
  if (!changeRequest) return { error: "Describe the change you'd like first." };

  const source = await prisma.designConcept.findUnique({ where: { id: conceptId } });
  if (!source || source.projectId !== projectId) return { error: "That design could not be found on this project." };
  if (source.status !== DesignConceptStatus.COMPLETE || !source.storagePath) {
    return { error: "That design isn't ready to be refined yet." };
  }

  const existingCount = await prisma.designConcept.count({ where: { projectId } });
  if (existingCount >= GENERATION_LIMITS.maxPerProject) {
    return { error: `This project has reached its limit of ${GENERATION_LIMITS.maxPerProject} generated designs.` };
  }

  const definition = getProjectTypeDefinition(project.projectType);
  if (!definition) return { error: "This project's type is no longer recognized." };

  const requirements = await prisma.projectRequirements.findUnique({ where: { projectId } });
  const requirementsData = (requirements?.data as Record<string, unknown>) ?? {};
  const style = source.styleKey ? getDesignStyle(source.styleKey) : undefined;
  const prompt = buildDesignPrompt(project, definition, requirementsData, { styleModifier: style?.promptModifier, changeRequest });

  await startGeneration(projectId, project.homeownerId, [
    {
      sourcePhotoId: source.sourcePhotoId,
      mode: "edit",
      sourceStoragePath: source.storagePath,
      prompt,
      styleKey: source.styleKey ?? undefined,
      description: `Refinement of v${source.version}: ${changeRequest}`,
    },
  ]);
  return undefined;
}

/** Marks one concept as preferred (unmarking any other) and advances the project to DESIGN_READY if it hasn't gotten there yet. */
export async function selectDesignConcept(projectId: string, conceptId: string): Promise<void> {
  const project = await requireProjectOwnerOrGuest(projectId);

  const concept = await prisma.designConcept.findUnique({ where: { id: conceptId } });
  if (!concept || concept.projectId !== projectId) return;

  await prisma.$transaction([
    prisma.designConcept.updateMany({ where: { projectId }, data: { selectedByUser: false } }),
    prisma.designConcept.update({ where: { id: conceptId }, data: { selectedByUser: true } }),
  ]);

  if (!isAtOrPastStatus(project.status, ProjectStatus.DESIGN_READY)) {
    await prisma.project.update({ where: { id: projectId }, data: { status: ProjectStatus.DESIGN_READY } });
  }

  await prisma.activityLog.create({
    data: { type: "design_selected", actorId: project.homeownerId, projectId, metadata: { designConceptId: conceptId } },
  });

  revalidatePath(`/projects/${projectId}`);
}
