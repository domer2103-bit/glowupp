"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectOwner } from "@/lib/data/projects";
import { validateRequirementsData } from "@/lib/project-types";
import { generateDesignBatch } from "@/lib/actions/designs";
import { poundsToPence } from "@/lib/money";
import { ALLOWED_PHOTO_MIME_TYPES, MAX_PHOTO_BYTES, uploadPhoto } from "@/lib/storage";
import { ProjectStatus, PhotoType, type Prisma } from "@/generated/prisma/client";

export type ActionState = { error?: string } | undefined;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

/**
 * Same upload as uploadProjectPhoto (src/lib/actions/photos.ts), duplicated
 * rather than reused so it can revalidate the wizard's own route
 * (/redesign/[type]) instead of /projects/[id] — the wizard lives at a
 * different URL than the project detail page, and revalidating the wrong
 * path would leave the just-uploaded thumbnail invisible until next visit.
 */
export async function uploadRedesignPhoto(projectId: string, redesignPath: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const project = await requireProjectOwner(projectId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo to upload." };
  if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_MIME_TYPES)[number])) {
    return { error: "Only JPEG, PNG, WEBP, or HEIC photos are allowed." };
  }
  if (file.size > MAX_PHOTO_BYTES) return { error: `Photos must be under ${MAX_PHOTO_BYTES / (1024 * 1024)}MB.` };

  const key = `${project.id}/${randomUUID()}.${EXTENSION_BY_MIME[file.type] ?? "jpg"}`;
  const result = await uploadPhoto(key, file);
  if ("error" in result) return { error: "Upload failed — please try again." };

  const uploadOrder = await prisma.projectPhoto.count({ where: { projectId: project.id } });
  await prisma.projectPhoto.create({
    data: {
      projectId: project.id,
      storagePath: result.storagePath,
      photoType: PhotoType.BEFORE,
      uploadOrder,
      metadata: { sizeBytes: file.size, mimeType: file.type, originalName: file.name },
    },
  });

  revalidatePath(redesignPath);
  return undefined;
}

const BUDGET_PRESETS: Record<string, { min?: number; max?: number }> = {
  under_5000: { max: 5000 },
  "5000_10000": { min: 5000, max: 10000 },
  "10000_20000": { min: 10000, max: 20000 },
  over_20000: { min: 20000 },
  not_sure: {},
};

/**
 * One consolidated submit for the guided redesign wizard (src/app/redesign/[type]/KitchenWizard.tsx):
 * saves the brief answers, sets the budget, and kicks off the first design
 * batch in a single action — the wizard never persists partial answers to
 * the server until this final step, so a half-filled visit never wipes out
 * a prior session's saved requirements the way calling
 * updateProjectRequirements per-step would.
 */
export async function submitRedesignBrief(
  projectId: string,
  photoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const project = await requireProjectOwner(projectId);

  const raw: Record<string, unknown> = {
    desiredStyle: formData.get("desiredStyle") || undefined,
    changesWanted: formData.getAll("changesWanted"),
    coloursPreference: formData.getAll("coloursPreference"),
    mustHaveFeatures: formData.get("mustHaveFeatures") || undefined,
  };

  let validated;
  try {
    validated = validateRequirementsData(project.projectType, raw);
  } catch (err) {
    return { error: err instanceof z.ZodError ? (err.issues[0]?.message ?? "Invalid answers.") : "Invalid answers." };
  }

  const requirementsData = validated as Prisma.InputJsonValue;

  const budgetKey = formData.get("budgetPreset");
  const preset = typeof budgetKey === "string" ? BUDGET_PRESETS[budgetKey] : undefined;

  await prisma.$transaction([
    prisma.projectRequirements.upsert({
      where: { projectId },
      create: { projectId, data: requirementsData },
      update: { data: requirementsData },
    }),
    prisma.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.DESIGNING,
        budgetMin: preset?.min !== undefined ? poundsToPence(preset.min) : undefined,
        budgetMax: preset?.max !== undefined ? poundsToPence(preset.max) : undefined,
      },
    }),
    prisma.activityLog.create({
      data: { type: "requirement_updated", actorId: project.homeownerId, projectId },
    }),
  ]);

  const photo = await prisma.projectPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.projectId !== projectId) {
    return { error: "Upload a photo of your space before generating a design." };
  }

  await generateDesignBatch(projectId, photoId, undefined, new FormData());

  redirect(`/projects/${projectId}`);
}
