import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { requireProjectOwner } from "@/lib/data/projects";
import { getOutwardCode } from "@/lib/postcode";
import { evaluateMatch } from "@/lib/matching";
import { UserRole, ProjectStatus, TransactionStatus } from "@/generated/prisma/client";

/** All quote requests sent out for a project, most recent first — homeowner-owner only. */
export async function getProjectQuoteRequests(projectId: string) {
  await requireProjectOwner(projectId);
  return prisma.quoteRequest.findMany({
    where: { projectId },
    include: { professional: true },
    orderBy: { sentAt: "desc" },
  });
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
    },
    orderBy: { updatedAt: "desc" },
  });

  return openProjects
    .filter((project) => evaluateMatch({ projectType: project.projectType, postcode: project.postcode, budgetMin: project.budgetMin, budgetMax: project.budgetMax, targetStartDate: project.targetStartDate }, professional).isMatch)
    .map((project) => ({ ...project, postcode: getOutwardCode(project.postcode) }));
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
    include: { project: true, transaction: true },
    orderBy: { sentAt: "desc" },
  });

  for (const r of requests) {
    if (!r.selected || r.transaction?.status !== TransactionStatus.PAID) {
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
