import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { requireProjectOwner } from "@/lib/data/projects";
import { getOutwardCode } from "@/lib/postcode";
import { UserRole, QuoteRequestStatus, TransactionStatus } from "@/generated/prisma/client";

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
 * Every quote request sent to the current professional, across all their
 * projects. Side effect: any still-PENDING request being returned here is
 * marked VIEWED — viewing the opportunities list *is* "opening" the
 * request, so there's no separate "mark as viewed" action to forget to
 * call. Mirrors how the assistant's first message triggers
 * "assistant_started" as a side effect rather than a dedicated action.
 */
export async function getProfessionalOpportunities() {
  const user = await requireRole(UserRole.PROFESSIONAL);

  const professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) return [];

  const requests = await prisma.quoteRequest.findMany({
    where: { professionalId: professional.id },
    include: { project: true, transaction: true },
    orderBy: { sentAt: "desc" },
  });

  const pendingRequests = requests.filter((r) => r.status === QuoteRequestStatus.PENDING);
  if (pendingRequests.length > 0) {
    const pendingIds = pendingRequests.map((r) => r.id);
    await prisma.quoteRequest.updateMany({
      where: { id: { in: pendingIds } },
      data: { status: QuoteRequestStatus.VIEWED, viewedAt: new Date() },
    });
    await prisma.activityLog.createMany({
      data: pendingRequests.map((r) => ({
        type: "quote_viewed",
        actorId: user.id,
        projectId: r.projectId,
        metadata: { quoteRequestId: r.id },
      })),
    });
    for (const r of requests) {
      if (pendingIds.includes(r.id)) {
        r.status = QuoteRequestStatus.VIEWED;
        r.viewedAt = new Date();
      }
    }
  }

  // Privacy: a professional only sees the postcode *area* (e.g. "L18",
  // not "L18 5NF") until they're both selected AND their lead fee is
  // paid — matching that district is all they need to decide whether to
  // quote. The full postcode reveals once the fee clears, when they
  // genuinely need it to do the work. This is also a soft deterrent
  // against a professional finding the exact address and arranging the
  // job off-platform before ever winning it through GlowUpp.
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
