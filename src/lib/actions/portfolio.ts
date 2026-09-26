"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";
import { ALLOWED_PHOTO_MIME_TYPES, MAX_PHOTO_BYTES, uploadPortfolioPhoto as uploadToStorage, deleteStorageObject } from "@/lib/storage";
import { UserRole } from "@/generated/prisma/client";

export type ActionState = { error?: string } | undefined;

const MAX_PORTFOLIO_PHOTOS = 6;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

/**
 * Professional action: adds one photo to their portfolio (up to
 * MAX_PORTFOLIO_PHOTOS). Unlike ProjectPhoto/verification documents,
 * these are shown to homeowners upfront — the whole point is to
 * influence who gets picked, not something to gate behind selection.
 */
export async function uploadPortfolioPhoto(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(UserRole.PROFESSIONAL);

  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) return { error: "Complete your professional profile first." };

  const count = await prisma.professionalPortfolioPhoto.count({ where: { professionalId: professional.id } });
  if (count >= MAX_PORTFOLIO_PHOTOS) {
    return { error: `You can upload up to ${MAX_PORTFOLIO_PHOTOS} photos — delete one first to add another.` };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_MIME_TYPES)[number])) {
    return { error: "Only JPEG, PNG, WEBP, or HEIC photos are allowed." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: `Photos must be under ${MAX_PHOTO_BYTES / (1024 * 1024)}MB.` };
  }

  const key = `${professional.id}/${randomUUID()}.${EXTENSION_BY_MIME[file.type] ?? "jpg"}`;
  const result = await uploadToStorage(key, file);
  if ("error" in result) return { error: "Upload failed — please try again." };

  await prisma.professionalPortfolioPhoto.create({
    data: { professionalId: professional.id, storagePath: result.storagePath, uploadOrder: count },
  });

  revalidatePath("/professional/portfolio");
  return undefined;
}

export async function deletePortfolioPhoto(photoId: string): Promise<void> {
  const user = await requireUser();

  const photo = await prisma.professionalPortfolioPhoto.findUnique({
    where: { id: photoId },
    include: { professional: true },
  });
  if (!photo || photo.professional.userId !== user.id) notFound();

  await deleteStorageObject(photo.storagePath);
  await prisma.professionalPortfolioPhoto.delete({ where: { id: photoId } });

  revalidatePath("/professional/portfolio");
}
