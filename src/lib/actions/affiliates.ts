"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { AffiliateStatus, UserRole } from "@/generated/prisma/client";
import { AFFILIATE_CATEGORIES } from "@/lib/affiliate";
import { AffiliateEmailTakenError, createAffiliatePartner, recordAffiliatePayout } from "@/lib/data/affiliates";

export type AffiliateActionState = { error?: string } | undefined;

const NewPartnerSchema = z.object({
  businessName: z.string().trim().min(2, "Enter the business name.").max(80, "Business name is too long."),
  contactName: z.string().trim().min(2, "Enter a contact person.").max(80, "Contact name is too long."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(120),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long.")
    .transform((v) => (v === "" ? null : v)),
  category: z.enum(AFFILIATE_CATEGORIES, { message: "Choose a category." }),
});

/** Admin-only: creates a B2B partner with a fresh referral code and QR slug, then opens their page (links and marketing assets). */
export async function createAffiliate(_prev: AffiliateActionState, formData: FormData): Promise<AffiliateActionState> {
  const admin = await requireRole(UserRole.ADMIN);

  const parsed = NewPartnerSchema.safeParse({
    businessName: formData.get("businessName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    category: formData.get("category"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  let partner;
  try {
    partner = await createAffiliatePartner(parsed.data);
  } catch (err) {
    if (err instanceof AffiliateEmailTakenError) return { error: "A partner with that email address already exists." };
    throw err;
  }
  await prisma.activityLog.create({
    data: { type: "affiliate_partner_created", actorId: admin.id, metadata: { partnerId: partner.id, businessName: partner.businessName } },
  });

  revalidatePath("/admin/affiliates");
  redirect(`/admin/affiliates/${partner.id}`);
}

/** Admin-only: suspend or reactivate. A suspended partner's link stops attributing new visitors and no new earnings accrue; what they already earned stays payable. */
export async function setAffiliateStatus(partnerId: string, status: string): Promise<void> {
  const admin = await requireRole(UserRole.ADMIN);
  const parsed = z.enum([AffiliateStatus.ACTIVE, AffiliateStatus.SUSPENDED]).safeParse(status);
  if (!parsed.success) return;

  const partner = await prisma.affiliatePartner.findUnique({ where: { id: partnerId } });
  if (!partner || partner.status === parsed.data) return;

  await prisma.affiliatePartner.update({ where: { id: partnerId }, data: { status: parsed.data } });
  await prisma.activityLog.create({
    data: { type: "affiliate_status_changed", actorId: admin.id, metadata: { partnerId, from: partner.status, to: parsed.data } },
  });

  revalidatePath("/admin/affiliates");
  revalidatePath(`/admin/affiliates/${partnerId}`);
}

/**
 * Admin-only: records that the partner's outstanding balance has been paid
 * (the money itself is sent outside this system — bank transfer etc.). The
 * form carries the exact amount the admin was looking at; if the balance
 * has moved since, nothing is recorded and the page simply reloads with the
 * new figure.
 */
export async function markAffiliatePaid(partnerId: string, expectedPence: number, formData: FormData): Promise<void> {
  const admin = await requireRole(UserRole.ADMIN);
  const rawNote = formData.get("note");
  const note = typeof rawNote === "string" && rawNote.trim() !== "" ? rawNote.trim().slice(0, 200) : null;

  await recordAffiliatePayout(partnerId, expectedPence, admin.id, note);

  revalidatePath("/admin/affiliates");
  revalidatePath(`/admin/affiliates/${partnerId}`);
}
