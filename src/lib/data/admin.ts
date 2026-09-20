import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";

/** Every professional, most recently created first — admin-only, no ownership scoping (this is the one place a full unscoped list is legitimate). */
export async function getAllProfessionals() {
  await requireRole(UserRole.ADMIN);

  return prisma.professional.findMany({
    include: { user: true, services: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Every lead-fee transaction across every professional/project — admin-only. */
export async function getAllTransactions() {
  await requireRole(UserRole.ADMIN);

  return prisma.transaction.findMany({
    include: { professional: true, project: true },
    orderBy: { createdAt: "desc" },
  });
}
