"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { requireProjectOwner } from "@/lib/data/projects";
import { getActivePipelineForProject, activeLockWhere } from "@/lib/data/private-pipeline";
import { validateProjectReadyForQuotes, type ActionState } from "@/lib/actions/quotes";
import { notifyPrivateEstimateRequested, notifyPrivateQuoteSubmitted } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseLineItems, sumLineItems, validateDeposit } from "@/lib/pipeline-quote";
import { poundsToPence } from "@/lib/money";
import { ProjectStatus, QuoteRequestStatus, UserRole } from "@/generated/prisma/client";

/**
 * Homeowner: "Send render & request official estimate" — the private
 * pipeline's replacement for "Push to open market". Needs a signed-in
 * owner (same as the marketplace gate: a guest has no way to be reached),
 * a chosen design and the project's required answers. Creates the single
 * QuoteRequest to the locked contractor, which also opens the existing
 * message thread between the two. Idempotent.
 */
export async function requestPrivateEstimate(projectId: string): Promise<ActionState> {
  const project = await requireProjectOwner(projectId);

  const lock = await getActivePipelineForProject(projectId);
  if (!lock) return { error: "This project isn't in a private design portal." };

  const existing = await prisma.quoteRequest.findFirst({ where: { projectId, professionalId: lock.professionalId } });
  if (existing) return undefined;

  const validationError = await validateProjectReadyForQuotes(project);
  if (validationError) return { error: validationError.replace("pushing to the open market", "sending your estimate request").replace("before pushing to the open market", "before sending your estimate request") };

  const pro = await prisma.professional.findUniqueOrThrow({ where: { id: lock.professionalId }, include: { user: true } });

  await prisma.$transaction([
    prisma.quoteRequest.create({ data: { projectId, homeownerId: project.homeownerId, professionalId: lock.professionalId, status: QuoteRequestStatus.PENDING } }),
    prisma.privatePipelineSession.update({ where: { id: lock.id }, data: { estimateRequestedAt: new Date() } }),
    prisma.project.update({ where: { id: projectId }, data: { status: ProjectStatus.REQUESTING_QUOTES } }),
    prisma.activityLog.create({ data: { type: "private_estimate_requested", actorId: project.homeownerId, projectId, metadata: { professionalId: lock.professionalId } } }),
  ]);

  await notifyPrivateEstimateRequested({ professionalEmail: pro.user.email, professionalName: pro.user.name, projectTitle: project.title });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/professional/pipeline");
  return undefined;
}

const QuoteFormSchema = z.object({
  quoteTimeline: z.string().trim().min(1, "Enter an estimated timeline.").max(200),
  quoteNotes: z.string().trim().max(2000).optional(),
  deposit: z.string().trim().optional(),
});

/**
 * Contractor: sends (or revises) the itemised quote for a lead in their
 * private pipeline, optionally asking for a deposit. The deposit is a
 * recorded request only — the client pays the contractor directly;
 * GlowUpp never processes homeowner→professional money. Only possible
 * once the client has requested an estimate, and not after the client has
 * selected this contractor (the agreed quote is then fixed).
 */
export async function submitPrivateQuote(sessionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(UserRole.PROFESSIONAL);
  if (!checkRateLimit(`private-quote:${user.id}`, 30, 60 * 60 * 1000)) return { error: "You're sending quotes too quickly — try again later." };

  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) return { error: "Complete your professional profile first." };

  // Scoped to the caller's own professional id, so another contractor's session id finds nothing.
  const session = await prisma.privatePipelineSession.findFirst({ where: { id: sessionId, professionalId: professional.id, ...activeLockWhere() }, include: { project: true } });
  if (!session) return { error: "This lead isn't available." };

  const quoteRequest = await prisma.quoteRequest.findFirst({ where: { projectId: session.projectId, professionalId: professional.id } });
  if (!quoteRequest) return { error: "The client hasn't requested an estimate yet." };
  if (quoteRequest.selected) return { error: "The client has already accepted this quote." };

  const base = QuoteFormSchema.safeParse({ quoteTimeline: formData.get("quoteTimeline"), quoteNotes: formData.get("quoteNotes") || undefined, deposit: formData.get("deposit") || undefined });
  if (!base.success) return { error: base.error.issues[0]?.message ?? "Please check the form." };

  const descriptions = formData.getAll("itemDescription").map(String);
  const amounts = formData.getAll("itemAmount").map(String);
  const items = parseLineItems(descriptions.map((description, i) => ({ description, amount: amounts[i] ?? "" })));
  if (!items.ok) return { error: items.error };
  const total = sumLineItems(items.value);

  let depositPence: number | null = null;
  if (base.data.deposit) {
    const pounds = Number(base.data.deposit);
    if (!Number.isFinite(pounds)) return { error: "Enter the deposit as a number of pounds, or leave it blank." };
    const deposit = validateDeposit(poundsToPence(pounds), total);
    if (!deposit.ok) return { error: deposit.error };
    depositPence = deposit.value;
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.quoteRequest.update({
      where: { id: quoteRequest.id },
      data: {
        status: QuoteRequestStatus.QUOTED,
        respondedAt: now,
        quoteAmount: total,
        quoteLineItems: items.value,
        quoteTimeline: base.data.quoteTimeline,
        quoteNotes: base.data.quoteNotes,
        depositAmount: depositPence,
        depositRequestedAt: depositPence ? (quoteRequest.depositAmount === depositPence ? quoteRequest.depositRequestedAt ?? now : now) : null,
        // A revised deposit amount starts a fresh request.
        depositReceivedAt: depositPence && quoteRequest.depositAmount === depositPence ? quoteRequest.depositReceivedAt : null,
      },
    }),
    ...(session.project.status === ProjectStatus.REQUESTING_QUOTES ? [prisma.project.update({ where: { id: session.projectId }, data: { status: ProjectStatus.QUOTES_RECEIVED } })] : []),
    prisma.activityLog.create({ data: { type: "private_quote_submitted", actorId: user.id, projectId: session.projectId, metadata: { quoteRequestId: quoteRequest.id, total, depositPence } } }),
  ]);

  const homeowner = await prisma.user.findUniqueOrThrow({ where: { id: session.homeownerId } });
  await notifyPrivateQuoteSubmitted({
    homeownerEmail: homeowner.email,
    homeownerName: homeowner.name,
    projectId: session.projectId,
    projectTitle: session.project.title,
    professionalBusinessName: professional.businessName,
    quoteAmountPence: total,
    quoteTimeline: base.data.quoteTimeline,
    depositPence,
  });

  revalidatePath("/professional/pipeline");
  revalidatePath(`/projects/${session.projectId}/quotes`);
  return undefined;
}

/** Contractor: records that the client's deposit reached them (paid outside GlowUpp). */
export async function markDepositReceived(quoteRequestId: string): Promise<void> {
  const user = await requireRole(UserRole.PROFESSIONAL);
  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) return;

  const { count } = await prisma.quoteRequest.updateMany({
    where: { id: quoteRequestId, professionalId: professional.id, depositAmount: { not: null }, depositReceivedAt: null },
    data: { depositReceivedAt: new Date() },
  });
  if (count === 1) revalidatePath("/professional/pipeline");
}
