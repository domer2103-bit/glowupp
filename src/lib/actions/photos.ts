"use server";

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectOwner } from "@/lib/data/projects";
import { PhotoType } from "@/generated/prisma/client";
import { ALLOWED_PHOTO_MIME_TYPES, MAX_PHOTO_BYTES, uploadPhoto, deleteStorageObject } from "@/lib/storage";

export type ActionState = { error?: string; info?: string } | undefined;

const PhotoTypeSchema = z.enum([PhotoType.BEFORE, PhotoType.INSPIRATION, PhotoType.OTHER]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export async function uploadProjectPhoto(projectId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const project = await requireProjectOwner(projectId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_MIME_TYPES)[number])) {
    return { error: "Only JPEG, PNG, WEBP, or HEIC photos are allowed." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: `Photos must be under ${MAX_PHOTO_BYTES / (1024 * 1024)}MB.` };
  }

  const photoTypeParsed = PhotoTypeSchema.safeParse(formData.get("photoType") || PhotoType.BEFORE);
  if (!photoTypeParsed.success) return { error: "Not a valid photo type." };

  const key = `${project.id}/${randomUUID()}.${EXTENSION_BY_MIME[file.type] ?? "jpg"}`;
  const result = await uploadPhoto(key, file);
  if ("error" in result) return { error: "Upload failed — please try again." };

  const uploadOrder = await prisma.projectPhoto.count({ where: { projectId: project.id } });

  await prisma.projectPhoto.create({
    data: {
      projectId: project.id,
      storagePath: result.storagePath,
      photoType: photoTypeParsed.data,
      uploadOrder,
      metadata: { sizeBytes: file.size, mimeType: file.type, originalName: file.name },
    },
  });

  await prisma.activityLog.create({
    data: { type: "photo_uploaded", actorId: project.homeownerId, projectId: project.id },
  });

  revalidatePath(`/projects/${project.id}`);
  return { info: "Photo uploaded." };
}

export async function deleteProjectPhoto(photoId: string) {
  const user = await requireUser();

  const photo = await prisma.projectPhoto.findUnique({
    where: { id: photoId },
    include: { project: true },
  });
  if (!photo || photo.project.homeownerId !== user.id) notFound();

  await deleteStorageObject(photo.storagePath);
  await prisma.projectPhoto.delete({ where: { id: photoId } });

  revalidatePath(`/projects/${photo.projectId}`);
}
