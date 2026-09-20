import "server-only";
import { prisma } from "@/lib/prisma";
import { requireQuoteRequestAccess } from "@/lib/data/quotes";

/**
 * Full thread for one quote request, oldest first — either the homeowner
 * or the professional on that request may read it (`requireQuoteRequestAccess`
 * covers both sides of Phase 8's authorization boundary, extended here
 * for messaging).
 */
export async function getMessages(quoteRequestId: string) {
  const { quoteRequest, viewerRole } = await requireQuoteRequestAccess(quoteRequestId);

  const messages = await prisma.message.findMany({
    where: { quoteRequestId },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
  });

  return { quoteRequest, viewerRole, messages };
}
