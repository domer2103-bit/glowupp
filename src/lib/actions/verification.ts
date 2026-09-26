"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  uploadVerificationDocument,
  deleteStorageObject,
  ALLOWED_VERIFICATION_DOCUMENT_MIME_TYPES,
  MAX_VERIFICATION_DOCUMENT_BYTES,
} from "@/lib/storage";
import { UserRole, VerificationStatus } from "@/generated/prisma/client";

export type ActionState = { error?: string } | undefined;

/**
 * Professional action: uploads a document (public liability insurance
 * certificate, in practice) for admin review. Entirely optional — never
 * required to quote (src/lib/matching.ts's checkNotRejected doesn't
 * gate on this) — it's a way to earn a "Verified" badge homeowners see
 * on quotes, not a gatekeeping step. Uploading always resets status to
 * PENDING, even if already VERIFIED, so a replaced document (e.g.
 * renewed insurance) doesn't leave a stale badge unreviewed.
 */
export async function submitVerificationDocument(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(UserRole.PROFESSIONAL);

  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) return { error: "Complete your professional profile first." };

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (!ALLOWED_VERIFICATION_DOCUMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_VERIFICATION_DOCUMENT_MIME_TYPES)[number])) {
    return { error: "Please upload a PDF, JPEG, or PNG." };
  }
  if (file.size > MAX_VERIFICATION_DOCUMENT_BYTES) {
    return { error: "File is too large (max 10MB)." };
  }

  const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const key = `${professional.id}/certificate.${extension}`;

  const result = await uploadVerificationDocument(key, file);
  if ("error" in result) return { error: result.error };

  if (professional.verificationDocumentPath && professional.verificationDocumentPath !== result.storagePath) {
    await deleteStorageObject(professional.verificationDocumentPath);
  }

  await prisma.professional.update({
    where: { id: professional.id },
    data: {
      verificationDocumentPath: result.storagePath,
      verificationSubmittedAt: new Date(),
      verificationStatus: VerificationStatus.PENDING,
    },
  });

  await prisma.activityLog.create({
    data: { type: "verification_document_submitted", actorId: user.id, metadata: { professionalId: professional.id } },
  });

  revalidatePath("/professional/verification");
  return undefined;
}
