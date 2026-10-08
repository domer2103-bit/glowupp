"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProjectOwner } from "@/lib/data/projects";
import { requireRole } from "@/lib/auth";
import { getProjectTypeDefinition, isFieldValueSet } from "@/lib/project-types";
import { evaluateMatch } from "@/lib/matching";
import { isAtOrPastStatus } from "@/lib/project-status";
import { poundsToPence } from "@/lib/money";
import { notifyProfessionalSelected, notifyOpenMarketProject, notifyQuoteSubmitted } from "@/lib/notifications";
import { calculateMarketplaceFee, calculatePrivateLinkFee } from "@/lib/fees";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertNotPrivate, countPriorMarketplaceJobs, countPriorPrivateLinkJobs } from "@/lib/data/private-pipeline";
import { ProjectStatus, QuoteRequestStatus, TransactionStatus, UserRole } from "@/generated/prisma/client";

export type ActionState = { error?: string } | undefined;

/**
 * The brief's "Validate project" step, made concrete: a project can't go
 * to the open market until a design has been chosen (status at or past
 * DESIGN_READY — Phase 6's selectDesignConcept is what gets it there) and
 * every field the project type marks `required` actually has a value.
 * Returns an error string, or null if the project is ready.
 */
export async function validateProjectReadyForQuotes(project: { id: string; projectType: string; status: ProjectStatus }): Promise<string | null> {
  if (!isAtOrPastStatus(project.status, ProjectStatus.DESIGN_READY)) {
    return "Select a preferred design concept before pushing to the open market.";
  }

  const definition = getProjectTypeDefinition(project.projectType);
  if (!definition) return "This project's type is no longer recognized.";

  const requirements = await prisma.projectRequirements.findUnique({ where: { projectId: project.id } });
  const data = (requirements?.data as Record<string, unknown>) ?? {};
  const missing = definition.fields.filter((f) => f.required && !isFieldValueSet(data[f.key]));
  if (missing.length > 0) {
    return `Please fill in before pushing to the open market: ${missing.map((f) => f.label).join(", ")}.`;
  }

  return null;
}

/**
 * Homeowner action: the only way a project becomes visible to
 * professionals at all — replaces the earlier "pick specific
 * professionals to invite" flow with a single opt-in gate. Everything
 * before this point (photos, AI design, requirements) is purely between
 * the homeowner and GlowUpp; nothing about the project exists to any
 * professional until this is clicked. Idempotent — pushing an
 * already-open project again is a harmless no-op, not an error.
 */
export async function pushToOpenMarket(projectId: string): Promise<ActionState> {
  const project = await requireProjectOwner(projectId);

  // Private Client Pipeline: a project locked to one contractor must never
  // reach the open marketplace, whatever the UI showed. Checked before the
  // idempotent "already open" return so a private project can't slip through it either.
  const privateError = await assertNotPrivate(projectId);
  if (privateError) return { error: privateError };

  if (isAtOrPastStatus(project.status, ProjectStatus.REQUESTING_QUOTES)) {
    return undefined;
  }

  const validationError = await validateProjectReadyForQuotes(project);
  if (validationError) return { error: validationError };

  await prisma.project.update({ where: { id: projectId }, data: { status: ProjectStatus.REQUESTING_QUOTES } });
  await prisma.activityLog.create({
    data: { type: "project_pushed_to_market", actorId: project.homeownerId, projectId },
  });

  const professionals = await prisma.professional.findMany({ include: { services: true, user: true } });
  const matches = professionals.filter(
    (pro) =>
      evaluateMatch(
        { projectType: project.projectType, postcode: project.postcode, budgetMin: project.budgetMin, budgetMax: project.budgetMax, targetStartDate: project.targetStartDate },
        pro
      ).isMatch
  );

  for (const pro of matches) {
    await notifyOpenMarketProject({
      professionalEmail: pro.user.email,
      professionalName: pro.user.name,
      projectTitle: project.title,
      projectType: project.projectType,
      postcode: project.postcode,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/quotes`);
  revalidatePath("/professional/open-projects");
  return undefined;
}

const SubmitQuoteSchema = z.object({
  quoteAmount: z.coerce.number().positive("Enter a quote amount."),
  quoteTimeline: z.string().trim().min(1, "Enter an estimated timeline."),
  quoteNotes: z.string().trim().max(2000).optional(),
});

/**
 * Professional action: submits a quote on an open-market project they
 * found themselves — there's no invite to accept first, submitting a
 * quote both creates the QuoteRequest and fills it in one step. Every
 * eligibility rule (type, area, verification, availability) is
 * re-checked server-side regardless of what the browse list showed,
 * same defensive reasoning as the old requestQuotes had for tampered
 * professional IDs.
 */
export async function submitOpenMarketQuote(projectId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(UserRole.PROFESSIONAL);

  if (!checkRateLimit(`submit-open-quote:${user.id}`, 20, 60 * 60 * 1000)) {
    return { error: "You're submitting quotes too quickly — please try again later." };
  }

  const professional = await prisma.professional.findUnique({ where: { userId: user.id }, include: { services: true } });
  if (!professional) return { error: "Complete your professional profile first." };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "This project no longer exists." };
  if (!isAtOrPastStatus(project.status, ProjectStatus.REQUESTING_QUOTES) || project.status === ProjectStatus.CANCELLED) {
    return { error: "This project isn't open for quotes." };
  }
  // Private pipeline projects take quotes only through submitPrivateQuote, from the locked contractor.
  if (await assertNotPrivate(projectId)) return { error: "This project isn't open for quotes." };

  const match = evaluateMatch(
    { projectType: project.projectType, postcode: project.postcode, budgetMin: project.budgetMin, budgetMax: project.budgetMax, targetStartDate: project.targetStartDate },
    professional
  );
  if (!match.isMatch) return { error: "This project isn't currently eligible for your profile." };

  const existing = await prisma.quoteRequest.findFirst({ where: { projectId, professionalId: professional.id } });
  if (existing) return { error: "You've already sent a quote for this project." };

  const parsed = SubmitQuoteSchema.safeParse({
    quoteAmount: formData.get("quoteAmount"),
    quoteTimeline: formData.get("quoteTimeline"),
    quoteNotes: formData.get("quoteNotes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };

  const now = new Date();
  const quoteRequest = await prisma.quoteRequest.create({
    data: {
      projectId,
      homeownerId: project.homeownerId,
      professionalId: professional.id,
      status: QuoteRequestStatus.QUOTED,
      sentAt: now,
      respondedAt: now,
      quoteAmount: poundsToPence(parsed.data.quoteAmount),
      quoteTimeline: parsed.data.quoteTimeline,
      quoteNotes: parsed.data.quoteNotes,
    },
  });

  if (project.status === ProjectStatus.REQUESTING_QUOTES) {
    await prisma.project.update({ where: { id: projectId }, data: { status: ProjectStatus.QUOTES_RECEIVED } });
  }

  await prisma.activityLog.create({
    data: { type: "quote_submitted", actorId: user.id, projectId, metadata: { quoteRequestId: quoteRequest.id } },
  });

  const homeowner = await prisma.user.findUniqueOrThrow({ where: { id: project.homeownerId } });
  await notifyQuoteSubmitted({
    homeownerEmail: homeowner.email,
    homeownerName: homeowner.name,
    projectId,
    projectTitle: project.title,
    professionalBusinessName: professional.businessName,
    quoteAmountPence: poundsToPence(parsed.data.quoteAmount),
    quoteTimeline: parsed.data.quoteTimeline,
  });

  revalidatePath("/professional/open-projects");
  revalidatePath("/professional/opportunities");
  revalidatePath(`/projects/${projectId}/quotes`);
  return undefined;
}

/** Homeowner action: picks the winning quote. Only one quote request per project can be selected at a time (same pattern as selectDesignConcept, Phase 6). */
export async function selectProfessional(projectId: string, quoteRequestId: string): Promise<void> {
  const project = await requireProjectOwner(projectId);

  const quoteRequest = await prisma.quoteRequest.findUnique({ where: { id: quoteRequestId } });
  if (!quoteRequest || quoteRequest.projectId !== projectId || quoteRequest.status !== QuoteRequestStatus.QUOTED) return;
  // Guaranteed set whenever status is QUOTED (submitOpenMarketQuote always
  // writes it together with the status change) — this is a defensive
  // check against that invariant, not an expected runtime path.
  if (quoteRequest.quoteAmount === null) return;

  // Private-pipeline jobs are the contractor's own client, so they're priced
  // differently from marketplace leads: a contractor's first
  // PRIVATE_LINK_FREE_JOBS are free (recorded as a £0 PAID Transaction, which
  // also unlocks the full address and counts towards the three), after that
  // 1% of the quote through the same pay-to-unlock + Stripe flow as any
  // other lead fee.
  if (project.isPrivatePipeline) {
    const priorJobs = await countPriorPrivateLinkJobs(quoteRequest.professionalId, quoteRequestId);
    const privateFee = calculatePrivateLinkFee(quoteRequest.quoteAmount, priorJobs);
    const free = privateFee === 0;
    await prisma.$transaction([
      prisma.quoteRequest.updateMany({ where: { projectId }, data: { selected: false } }),
      prisma.quoteRequest.update({ where: { id: quoteRequestId }, data: { selected: true } }),
      prisma.transaction.upsert({
        where: { quoteRequestId },
        create: {
          quoteRequestId,
          professionalId: quoteRequest.professionalId,
          projectId,
          feeAmount: privateFee,
          status: free ? TransactionStatus.PAID : TransactionStatus.PENDING,
          paidAt: free ? new Date() : null,
        },
        update: {
          feeAmount: privateFee,
          status: free ? TransactionStatus.PAID : TransactionStatus.PENDING,
          createdAt: new Date(),
          paidAt: free ? new Date() : null,
          feeFinalNoticeSentAt: null,
          stripeCheckoutSessionId: null,
          stripePaymentIntentId: null,
        },
      }),
      prisma.project.update({ where: { id: projectId }, data: { status: ProjectStatus.PROFESSIONAL_SELECTED } }),
      prisma.activityLog.create({
        data: { type: "professional_selected", actorId: project.homeownerId, projectId, metadata: { quoteRequestId, privatePipeline: true, priorPrivateJobs: priorJobs, feeAmount: privateFee } },
      }),
    ]);
    if (!free) {
      const selectedPro = await prisma.professional.findUnique({ where: { id: quoteRequest.professionalId }, include: { user: true } });
      if (selectedPro) {
        await notifyProfessionalSelected({
          professionalEmail: selectedPro.user.email,
          professionalName: selectedPro.user.name,
          projectTitle: project.title,
          selected: true,
        });
      }
    }
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quotes`);
    revalidatePath("/professional/pipeline");
    revalidatePath("/professional/transactions");
    return;
  }

  // Early-bird offer: a professional who signed up before Black Friday 2026
  // pays no commission on their first two marketplace jobs — recorded as a £0,
  // already-PAID Transaction (which unlocks the address and counts towards the two).
  const proAccount = await prisma.professional.findUniqueOrThrow({ where: { id: quoteRequest.professionalId }, include: { user: { select: { createdAt: true } } } });
  const priorMarketplaceJobs = await countPriorMarketplaceJobs(quoteRequest.professionalId, quoteRequestId);
  const feeAmount = calculateMarketplaceFee(quoteRequest.quoteAmount, priorMarketplaceJobs, proAccount.user.createdAt);
  const freeJob = feeAmount === 0;

  await prisma.$transaction([
    prisma.quoteRequest.updateMany({ where: { projectId }, data: { selected: false } }),
    prisma.quoteRequest.update({ where: { id: quoteRequestId }, data: { selected: true } }),
    // upsert, not create: a homeowner can select the same professional
    // again after an earlier selection's lead fee auto-cancelled
    // (src/lib/lead-fee-reminders.ts) — Transaction.quoteRequestId is
    // unique, so this resets that row to a fresh PENDING cycle instead
    // of colliding with the cancelled one.
    prisma.transaction.upsert({
      where: { quoteRequestId },
      create: { quoteRequestId, professionalId: quoteRequest.professionalId, projectId, feeAmount, status: freeJob ? TransactionStatus.PAID : TransactionStatus.PENDING, paidAt: freeJob ? new Date() : null },
      update: {
        feeAmount,
        status: freeJob ? TransactionStatus.PAID : TransactionStatus.PENDING,
        createdAt: new Date(),
        paidAt: freeJob ? new Date() : null,
        feeFinalNoticeSentAt: null,
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
      },
    }),
  ]);

  await prisma.project.update({ where: { id: projectId }, data: { status: ProjectStatus.PROFESSIONAL_SELECTED } });

  await prisma.activityLog.create({
    data: { type: "professional_selected", actorId: project.homeownerId, projectId, metadata: { quoteRequestId } },
  });

  await prisma.activityLog.create({
    data: { type: "lead_fee_created", actorId: project.homeownerId, projectId, metadata: { quoteRequestId, feeAmount } },
  });

  const quotedRequests = await prisma.quoteRequest.findMany({
    where: { projectId, status: QuoteRequestStatus.QUOTED },
    include: { professional: { include: { user: true } } },
  });
  for (const qr of quotedRequests) {
    await notifyProfessionalSelected({
      professionalEmail: qr.professional.user.email,
      professionalName: qr.professional.user.name,
      projectTitle: project.title,
      selected: qr.id === quoteRequestId,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/quotes`);
}
