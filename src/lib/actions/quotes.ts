"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProjectOwner } from "@/lib/data/projects";
import { requireQuoteRequestForProfessional } from "@/lib/data/quotes";
import { getProjectTypeDefinition, isFieldValueSet } from "@/lib/project-types";
import { evaluateMatch } from "@/lib/matching";
import { isAtOrPastStatus } from "@/lib/project-status";
import { poundsToPence } from "@/lib/money";
import { notifyProfessionalSelected, notifyQuoteRequested, notifyQuoteSubmitted } from "@/lib/notifications";
import { calculateLeadFee } from "@/lib/fees";
import { checkRateLimit } from "@/lib/rate-limit";
import { ProjectStatus, QuoteRequestStatus } from "@/generated/prisma/client";

export type ActionState = { error?: string } | undefined;

/**
 * The brief's "Validate project" step, made concrete: a project can't
 * request quotes until a design has been chosen (status at or past
 * DESIGN_READY — Phase 6's selectDesignConcept is what gets it there) and
 * every field the project type marks `required` actually has a value.
 * Returns an error string, or null if the project is ready.
 */
export async function validateProjectReadyForQuotes(project: { id: string; projectType: string; status: ProjectStatus }): Promise<string | null> {
  if (!isAtOrPastStatus(project.status, ProjectStatus.DESIGN_READY)) {
    return "Select a preferred design concept before requesting quotes.";
  }

  const definition = getProjectTypeDefinition(project.projectType);
  if (!definition) return "This project's type is no longer recognized.";

  const requirements = await prisma.projectRequirements.findUnique({ where: { projectId: project.id } });
  const data = (requirements?.data as Record<string, unknown>) ?? {};
  const missing = definition.fields.filter((f) => f.required && !isFieldValueSet(data[f.key]));
  if (missing.length > 0) {
    return `Please fill in before requesting quotes: ${missing.map((f) => f.label).join(", ")}.`;
  }

  return null;
}

/**
 * Homeowner action: sends quote requests to the selected professionals.
 * Every selected professional is re-checked against the matching rules
 * server-side (src/lib/matching.ts) — the checkboxes on the form reflect
 * what the client saw, but a tampered submission naming a non-matching or
 * made-up professional ID must not create a request.
 */
export async function requestQuotes(projectId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const project = await requireProjectOwner(projectId);

  if (!checkRateLimit(`request-quotes:${project.homeownerId}`, 20, 60 * 60 * 1000)) {
    return { error: "You're requesting quotes too quickly — please try again later." };
  }

  const validationError = await validateProjectReadyForQuotes(project);
  if (validationError) return { error: validationError };

  const professionalIds = formData.getAll("professionalIds").map(String);
  if (professionalIds.length === 0) return { error: "Select at least one professional to request a quote from." };

  const message = (formData.get("message") as string | null)?.trim() || undefined;

  const candidates = await prisma.professional.findMany({
    where: { id: { in: professionalIds } },
    include: { services: true, user: true },
  });

  const validMatches = candidates.filter(
    (pro) =>
      evaluateMatch(
        { projectType: project.projectType, postcode: project.postcode, budgetMin: project.budgetMin, budgetMax: project.budgetMax, targetStartDate: project.targetStartDate },
        pro
      ).isMatch
  );

  if (validMatches.length === 0) {
    return { error: "None of the selected professionals are currently eligible for this project." };
  }

  const existing = await prisma.quoteRequest.findMany({
    where: { projectId, professionalId: { in: validMatches.map((p) => p.id) } },
    select: { professionalId: true },
  });
  const alreadyRequested = new Set(existing.map((e) => e.professionalId));
  const toRequest = validMatches.filter((pro) => !alreadyRequested.has(pro.id));

  for (const pro of toRequest) {
    const quoteRequest = await prisma.quoteRequest.create({
      data: { projectId, homeownerId: project.homeownerId, professionalId: pro.id, message },
    });
    await prisma.activityLog.create({
      data: { type: "quote_requested", actorId: project.homeownerId, projectId, metadata: { quoteRequestId: quoteRequest.id, professionalId: pro.id } },
    });
    await notifyQuoteRequested({
      professionalEmail: pro.user.email,
      professionalName: pro.user.name,
      projectTitle: project.title,
      projectType: project.projectType,
      postcode: project.postcode,
      homeownerMessage: message,
    });
  }

  if (!isAtOrPastStatus(project.status, ProjectStatus.REQUESTING_QUOTES)) {
    await prisma.project.update({ where: { id: projectId }, data: { status: ProjectStatus.REQUESTING_QUOTES } });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/professionals`);
  revalidatePath(`/projects/${projectId}/quotes`);
  return undefined;
}

/** Professional action: passes on the opportunity. */
export async function declineQuoteRequest(quoteRequestId: string): Promise<void> {
  const quoteRequest = await requireQuoteRequestForProfessional(quoteRequestId);

  await prisma.quoteRequest.update({
    where: { id: quoteRequest.id },
    data: { status: QuoteRequestStatus.DECLINED, respondedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      type: "quote_declined",
      actorId: quoteRequest.professional.userId,
      projectId: quoteRequest.projectId,
      metadata: { quoteRequestId: quoteRequest.id },
    },
  });

  revalidatePath("/professional/opportunities");
  revalidatePath(`/projects/${quoteRequest.projectId}/quotes`);
}

const SubmitQuoteSchema = z.object({
  quoteAmount: z.coerce.number().positive("Enter a quote amount."),
  quoteTimeline: z.string().trim().min(1, "Enter an estimated timeline."),
  quoteNotes: z.string().trim().max(2000).optional(),
});

/** Professional action: submits the actual quote. Submitting a quote is treated as accepting the opportunity — there's no separate "accept" step (see docs/BACKEND_ARCHITECTURE.md §20 for why). */
export async function submitQuote(quoteRequestId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const quoteRequest = await requireQuoteRequestForProfessional(quoteRequestId);

  if (quoteRequest.status === QuoteRequestStatus.DECLINED) {
    return { error: "You've already declined this opportunity." };
  }

  const parsed = SubmitQuoteSchema.safeParse({
    quoteAmount: formData.get("quoteAmount"),
    quoteTimeline: formData.get("quoteTimeline"),
    quoteNotes: formData.get("quoteNotes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };

  await prisma.quoteRequest.update({
    where: { id: quoteRequest.id },
    data: {
      status: QuoteRequestStatus.QUOTED,
      respondedAt: new Date(),
      quoteAmount: poundsToPence(parsed.data.quoteAmount),
      quoteTimeline: parsed.data.quoteTimeline,
      quoteNotes: parsed.data.quoteNotes,
    },
  });

  await prisma.activityLog.create({
    data: {
      type: "quote_submitted",
      actorId: quoteRequest.professional.userId,
      projectId: quoteRequest.projectId,
      metadata: { quoteRequestId: quoteRequest.id },
    },
  });

  await notifyQuoteSubmitted({
    homeownerEmail: quoteRequest.homeowner.email,
    homeownerName: quoteRequest.homeowner.name,
    projectId: quoteRequest.projectId,
    projectTitle: quoteRequest.project.title,
    professionalBusinessName: quoteRequest.professional.businessName,
    quoteAmountPence: poundsToPence(parsed.data.quoteAmount),
    quoteTimeline: parsed.data.quoteTimeline,
  });

  revalidatePath("/professional/opportunities");
  revalidatePath(`/projects/${quoteRequest.projectId}/quotes`);
  return undefined;
}

/** Homeowner action: picks the winning quote. Only one quote request per project can be selected at a time (same pattern as selectDesignConcept, Phase 6). */
export async function selectProfessional(projectId: string, quoteRequestId: string): Promise<void> {
  const project = await requireProjectOwner(projectId);

  const quoteRequest = await prisma.quoteRequest.findUnique({ where: { id: quoteRequestId } });
  if (!quoteRequest || quoteRequest.projectId !== projectId || quoteRequest.status !== QuoteRequestStatus.QUOTED) return;
  // Guaranteed set whenever status is QUOTED (submitQuote always writes it
  // together with the status change) — this is a defensive check against
  // that invariant, not an expected runtime path.
  if (quoteRequest.quoteAmount === null) return;

  const feeAmount = calculateLeadFee(quoteRequest.quoteAmount);

  await prisma.$transaction([
    prisma.quoteRequest.updateMany({ where: { projectId }, data: { selected: false } }),
    prisma.quoteRequest.update({ where: { id: quoteRequestId }, data: { selected: true } }),
    prisma.transaction.create({
      data: { quoteRequestId, professionalId: quoteRequest.professionalId, projectId, feeAmount },
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
