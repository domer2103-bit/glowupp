"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/client";

/** A professional who joined through a partner's link chooses whether that partner can see their business name. Anyone else: nothing to change. */
export async function setShareNameWithPartner(share: boolean): Promise<void> {
  const user = await requireRole(UserRole.PROFESSIONAL);
  if (!user.affiliatePartnerId) return;
  await prisma.professional.updateMany({ where: { userId: user.id }, data: { shareNameWithPartner: share } });
  revalidatePath("/dashboard");
}
