"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProjectOwnerOrGuest } from "@/lib/data/projects";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { buildDesignPrompt, runDesignGeneration } from "@/lib/design-generation";
import { GENERATION_LIMITS } from "@/lib/generation-limits";
import { DESIGN_STYLES, getDesignStyle } from "@/lib/design-styles";
import { isAtOrPastStatus } from "@/lib/project-status";
import { getChosenConcept, photosNeedingDesign } from "@/lib/design-selection";
import { getImageProvider } from "@/lib/image-providers";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { DesignConceptStatus, ProjectStatus } from "@/generated/prisma/client";

export type ActionState = { error?: string } | undefined;

/**
 * Shared by every generation path (batch, regenerate, edit): creates the
 * row up front at a pre-allocated version number, attempts the provider
 * call, and updates the same row to COMPLETE or FAILED. A version number
 * is never skipped or reused, and a failed attempt stays visible rather
 * than disappearing — the brief's "never overwrite" requirement extends to
 * failed attempts too.
 */
async function runConceptAttempt(params: {
  projectId: string;
  sourcePhotoId: string;
  version: number;
  mode: "generate" | "regenerate" | "edit";
  sourceStoragePath: string;
  prompt: string;
  /** An approved design this generation should match — see runDesignGeneration. */
  referenceStoragePath?: string;
  styleKey?: string;
  description?: string;
  actorId: string;
}): Promise<void> {
  const concept = await prisma.designConcept.create({
    data: {
      projectId: params.projectId,
      sourcePhotoId: params.sourcePhotoId,
      generationPrompt: params.prompt,
      description: params.description,
      styleKey: params.styleKey,
      version: params.version,
      status: DesignConceptStatus.PROCESSING,
      provider: "kie.ai",
      model: "pending",
    },
  });

  try {
    const result = await runDesignGeneration({
      projectId: params.projectId,
      mode: params.mode,
      sourceStoragePath: params.sourceStoragePath,
      prompt: params.prompt,
      referenceStoragePath: params.referenceStoragePath,
    });
    await prisma.designConcept.update({
      where: { id: concept.id },
      data: { status: DesignConceptStatus.COMPLETE, storagePath: result.storagePath, provider: result.provider, model: result.model },
    });
    await prisma.activityLog.create({
      data: { type: "design_generated", actorId: params.actorId, projectId: params.projectId, metadata: { designConceptId: concept.id } },
    });
  } catch (err) {
    console.error("Design generation failed:", err);
    await prisma.designConcept.update({
      where: { id: concept.id },
      data: { status: DesignConceptStatus.FAILED, errorMessage: err instanceof Error ? err.message : "Unknown error" },
    });
  }
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

  const stylesToUse = DESIGN_STYLES.slice(0, Math.min(GENERATION_LIMITS.initialBatchSize, remaining, DESIGN_STYLES.length));

  const requirements = await prisma.projectRequirements.findUnique({ where: { projectId } });
  const requirementsData = (requirements?.data as Record<string, unknown>) ?? {};

  // Sequential, deliberately: running these in parallel would let two
  // attempts read the same "current count" and compute the same next
  // version before either commits, violating the (projectId, version)
  // unique constraint. This only runs a few times per project, so the
  // extra wall-clock time is an acceptable trade for not needing a
  // transaction/lock to make concurrent version allocation safe.
  let version = existingCount;
  for (const style of stylesToUse) {
    version += 1;
    const prompt = buildDesignPrompt(project, definition, requirementsData, { styleModifier: style.promptModifier });
    await runConceptAttempt({
      projectId,
      sourcePhotoId: photoId,
      version,
      mode: "generate",
      sourceStoragePath: photo.storagePath,
      prompt,
      styleKey: style.key,
      description: style.label,
      actorId: project.homeownerId,
    });
  }

  revalidatePath(`/projects/${projectId}`);
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

  // Sequential for the same reason as generateDesignBatch: version numbers are allocated up front and must not collide.
  let version = Math.max(...concepts.map((c) => c.version));
  for (const photo of targets) {
    version += 1;
    const prompt = buildDesignPrompt(project, definition, requirementsData, {
      styleModifier: style?.promptModifier,
      matchApprovedDesign: useReference,
    });
    await runConceptAttempt({
      projectId,
      sourcePhotoId: photo.id,
      version,
      mode: "generate",
      sourceStoragePath: photo.storagePath,
      prompt,
      referenceStoragePath: useReference ? chosen.storagePath : undefined,
      styleKey: chosen.styleKey ?? undefined,
      description: `${style?.label ?? "Chosen style"} — matched to your chosen design`,
      actorId: project.homeownerId,
    });
  }

  revalidatePath(`/projects/${projectId}`);
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

  await runConceptAttempt({
    projectId,
    sourcePhotoId: source.sourcePhotoId,
    version: existingCount + 1,
    mode: "regenerate",
    sourceStoragePath: source.sourcePhoto.storagePath,
    prompt,
    styleKey: source.styleKey ?? undefined,
    description: style?.label ?? source.description ?? undefined,
    actorId: project.homeownerId,
  });

  revalidatePath(`/projects/${projectId}`);
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

  await runConceptAttempt({
    projectId,
    sourcePhotoId: source.sourcePhotoId,
    version: existingCount + 1,
    mode: "edit",
    sourceStoragePath: source.storagePath,
    prompt,
    styleKey: source.styleKey ?? undefined,
    description: `Refinement of v${source.version}: ${changeRequest}`,
    actorId: project.homeownerId,
  });

  revalidatePath(`/projects/${projectId}`);
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
