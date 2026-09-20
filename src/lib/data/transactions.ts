import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";

/**
 * Every lead fee owed by the current professional, most recent first —
 * their own record only. Homeowners never see this: it's a commercial
 * arrangement between GlowUpp and the professional, not something the
 * homeowner has any stake in (see docs/BACKEND_ARCHITECTURE.md §23).
 */
export async function getProfessionalTransactions() {
  const user = await requireRole(UserRole.PROFESSIONAL);

  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) return [];

  return prisma.transaction.findMany({
    where: { professionalId: professional.id },
    include: { project: true },
    orderBy: { createdAt: "desc" },
  });
}
