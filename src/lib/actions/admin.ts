"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { UserRole, VerificationStatus, TransactionStatus } from "@/generated/prisma/client";

const VerificationStatusSchema = z.enum([
  VerificationStatus.UNVERIFIED,
  VerificationStatus.PENDING,
  VerificationStatus.VERIFIED,
  VerificationStatus.REJECTED,
]);

/** Admin-only: sets a professional's verification status. Used both to verify a real business and to reject a fraudulent/bad one. */
export async function updateProfessionalVerification(professionalId: string, status: string): Promise<void> {
  const admin = await requireRole(UserRole.ADMIN);

  const parsed = VerificationStatusSchema.safeParse(status);
  if (!parsed.success) return;

  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional) return;

  await prisma.professional.update({ where: { id: professionalId }, data: { verificationStatus: parsed.data } });

  await prisma.activityLog.create({
    data: {
      type: "professional_verification_changed",
      actorId: admin.id,
      metadata: { professionalId, from: professional.verificationStatus, to: parsed.data },
    },
  });

  revalidatePath("/admin/professionals");
}

const TransactionStatusSchema = z.enum([
  TransactionStatus.PENDING,
  TransactionStatus.PAID,
  TransactionStatus.WAIVED,
  TransactionStatus.CANCELLED,
]);

/** Admin-only: manually reconciles a lead fee — there's no live payment processor (Phase 11 is bookkeeping only), so this is how a real payment (bank transfer, invoice, etc.) collected outside this system gets reflected here. */
export async function updateTransactionStatus(transactionId: string, status: string): Promise<void> {
  const admin = await requireRole(UserRole.ADMIN);

  const parsed = TransactionStatusSchema.safeParse(status);
  if (!parsed.success) return;

  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) return;

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: parsed.data, paidAt: parsed.data === TransactionStatus.PAID ? new Date() : transaction.paidAt },
  });

  await prisma.activityLog.create({
    data: {
      type: "transaction_status_changed",
      actorId: admin.id,
      projectId: transaction.projectId,
      metadata: { transactionId, from: transaction.status, to: parsed.data },
    },
  });

  revalidatePath("/admin/transactions");
}
