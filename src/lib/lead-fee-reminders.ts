import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyLeadFeeFinalNotice, notifyLeadFeeCancelled, notifyProjectReopened } from "@/lib/notifications";
import { TransactionStatus, ProjectStatus } from "@/generated/prisma/client";

/**
 * A single 24h warning, then a 48h auto-cancel — deliberately compressed
 * from an earlier 3-step design (reminder → final notice → cancel) to
 * just 2 steps, per the product owner's explicit "faster cycle" call.
 */
const NOTICE_HOURS = 24;
const CANCEL_HOURS = 48;

/**
 * Runs both steps of the unpaid-lead-fee sequence in one pass — meant to
 * be called periodically (src/app/api/cron/lead-fee-reminders/route.ts),
 * not scheduled itself.
 */
export async function processPendingLeadFees(): Promise<{ noticesSent: number; cancelled: number }> {
  const now = Date.now();
  const noticeCutoff = new Date(now - NOTICE_HOURS * 60 * 60 * 1000);
  const cancelCutoff = new Date(now - CANCEL_HOURS * 60 * 60 * 1000);

  const pending = await prisma.transaction.findMany({
    where: { status: TransactionStatus.PENDING },
    include: {
      professional: { include: { user: true } },
      project: { include: { homeowner: true } },
      quoteRequest: true,
    },
  });

  let noticesSent = 0;
  let cancelled = 0;

  for (const t of pending) {
    if (t.createdAt <= cancelCutoff && t.feeFinalNoticeSentAt) {
      await prisma.$transaction([
        prisma.transaction.update({ where: { id: t.id }, data: { status: TransactionStatus.CANCELLED } }),
        prisma.quoteRequest.update({ where: { id: t.quoteRequestId }, data: { selected: false } }),
        prisma.project.update({ where: { id: t.projectId }, data: { status: ProjectStatus.QUOTES_RECEIVED } }),
      ]);

      await prisma.activityLog.create({
        data: { type: "lead_fee_cancelled", projectId: t.projectId, metadata: { transactionId: t.id } },
      });

      await notifyLeadFeeCancelled({
        professionalEmail: t.professional.user.email,
        professionalName: t.professional.user.name,
        projectTitle: t.project.title,
      });
      await notifyProjectReopened({
        homeownerEmail: t.project.homeowner.email,
        homeownerName: t.project.homeowner.name,
        projectId: t.projectId,
        projectTitle: t.project.title,
      });

      cancelled += 1;
      continue;
    }

    if (t.createdAt <= noticeCutoff && !t.feeFinalNoticeSentAt) {
      await notifyLeadFeeFinalNotice({
        professionalEmail: t.professional.user.email,
        professionalName: t.professional.user.name,
        projectTitle: t.project.title,
        feeAmountPence: t.feeAmount,
      });

      await prisma.transaction.update({ where: { id: t.id }, data: { feeFinalNoticeSentAt: new Date() } });
      await prisma.activityLog.create({
        data: { type: "lead_fee_final_notice_sent", projectId: t.projectId, metadata: { transactionId: t.id } },
      });

      noticesSent += 1;
    }
  }

  return { noticesSent, cancelled };
}
