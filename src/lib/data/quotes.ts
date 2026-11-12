import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { requireProjectOwner } from "@/lib/data/projects";
import { getOutwardCode } from "@/lib/postcode";
import { evaluateMatch } from "@/lib/matching";
import { describeRequirements } from "@/lib/project-types";
import { notPrivatePipelineWhere } from "@/lib/data/private-pipeline";
import { activeProIds } from "@/lib/data/subscriptions";
import { UserRole, ProjectStatus, TransactionStatus, VerificationStatus } from "@/generated/prisma/client";

/**
 * All quote requests sent out for a project, most recent first within
 * each group — homeowner-owner only. Verified professionals sort first:
 * the one real benefit of the optional verification badge (see
 * docs/BACKEND_ARCHITECTURE.md) is a better chance of being seen and
 * picked, not a requirement to quote at all. A paid Pro plan counts for
 * the same lift (and is labelled "Pro" on the page), so verified + Pro
 * comes first, then either one, then everyone else.
 */
export async function getProjectQuoteRequests(projectId: string) {
  await requireProjectOwner(projectId);
  const requests = await prisma.quoteRequest.findMany({
    where: { projectId },
    include: { professional: true },
    orderBy: { sentAt: "desc" },
  });

  const proIds = await activeProIds(requests.map((r) => r.professionalId));
  const withPro = requests.map((r) => ({ ...r, isPro: proIds.has(r.professionalId) }));
  const rank = (r: (typeof withPro)[number]) => (r.professional.verificationStatus === VerificationStatus.VERIFIED ? 1 : 0) + (r.isPro ? 1 : 0);
  return withPro.sort((a, b) => rank(b) - rank(a));
}

/**
 * Open-market projects the current professional could quote on: pushed
 * to market (or already has quotes), matches their type/area/
 * verification/availability, and they haven't already quoted on it.
 * Postcode is always shown as the outward code only here — full address
 * never appears pre-selection, same privacy rule as everywhere else.
 */
export async function getOpenMarketProjects() {
  const user = await requireRole(UserRole.PROFESSIONAL);

  const professional = await prisma.professional.findUnique({ where: { userId: user.id }, include: { services: true } });
  if (!professional) return [];

  const alreadyQuoted = await prisma.quoteRequest.findMany({
    where: { professionalId: professional.id },
    select: { projectId: true },
  });
  const excludeProjectIds = alreadyQuoted.map((q) => q.projectId);

  const openProjects = await prisma.project.findMany({
    where: {
      status: { in: [ProjectStatus.REQUESTING_QUOTES, ProjectStatus.QUOTES_RECEIVED] },
      id: { notIn: excludeProjectIds },
      // Projects locked to a contractor's private pipeline are never browsable.
      ...notPrivatePipelineWhere(),
    },
    orderBy: { updatedAt: "desc" },
    include: { requirements: true },
  });

  return openProjects
    .filter((project) => evaluateMatch({ projectType: project.projectType, postcode: project.postcode, budgetMin: project.budgetMin, budgetMax: project.budgetMax, targetStartDate: project.targetStartDate }, professional).isMatch)
    .map(({ requirements, ...project }) => ({
      ...project,
      postcode: getOutwardCode(project.postcode),
      brief: describeRequirements(project.projectType, requirements?.data),
    }));
}

/**
 * Quotes the current professional has submitted, across all their
 * projects, most recent first. Full postcode only reveals once they're
 * both selected AND their lead fee is paid — same gate as before, just
 * now the underlying quotes were self-submitted rather than invited.
 */
export async function getProfessionalQuotes() {
  const user = await requireRole(UserRole.PROFESSIONAL);

  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) return [];

  const requests = await prisma.quoteRequest.findMany({
    where: { professionalId: professional.id },
    include: { project: { include: { privatePipelineSession: { select: { id: true } } } }, transaction: true },
    orderBy: { sentAt: "desc" },
  });

  for (const r of requests) {
    // The full postcode unlocks once the fee is PAID — which includes a £0
    // "free private-link job" row. A private job selected before fee rows
    // existed for them has no Transaction at all and keeps its old
    // behaviour: selection alone reveals the postcode.
    const feeCleared = r.transaction?.status === TransactionStatus.PAID || (r.selected && r.project.isPrivatePipeline && !r.transaction);
    if (!r.selected || !feeCleared) {
      r.project.postcode = getOutwardCode(r.project.postcode);
    }
  }

  return requests;
}

/** Only the professional this request was sent to may act on it. 404, not 403, for the same reason as requireProjectOwner. */
export async function requireQuoteRequestForProfessional(quoteRequestId: string) {
  const user = await requireUser();

  const quoteRequest = await prisma.quoteRequest.findUnique({
    where: { id: quoteRequestId },
    include: { professional: true, project: true, homeowner: true },
  });
  if (!quoteRequest || quoteRequest.professional.userId !== user.id) notFound();

  return quoteRequest;
}

/**
 * Either side of a quote request's conversation may read/send on its
 * message thread (Phase 10) — the homeowner who owns the project, or the
 * professional it was sent to. 404, not 403, for anyone else, same
 * reasoning as every other ownership check in this codebase.
 */
export async function requireQuoteRequestAccess(quoteRequestId: string) {
  const user = await requireUser();

  const quoteRequest = await prisma.quoteRequest.findUnique({
    where: { id: quoteRequestId },
    include: { professional: { include: { user: true } }, project: true, homeowner: true },
  });
  if (!quoteRequest) notFound();

  if (quoteRequest.homeownerId === user.id) return { quoteRequest, viewerRole: "HOMEOWNER" as const };
  if (quoteRequest.professional.userId === user.id) return { quoteRequest, viewerRole: "PROFESSIONAL" as const };
  notFound();
}
