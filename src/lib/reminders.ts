import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyQuotesWaiting } from "@/lib/notifications";
import { QuoteRequestStatus } from "@/generated/prisma/client";

/**
 * The reminder's rules, agreed explicitly rather than assumed: only once
 * a homeowner has real choice (2+ quotes, not just the first one to
 * arrive), only once, and only after they've genuinely had time to look.
 * See docs/BACKEND_ARCHITECTURE.md §28 for why this narrow rule was
 * judged fair game while a general "come back and use the marketplace"
 * nudge wasn't.
 */
const MIN_QUOTES = 2;
const WAIT_HOURS = 48;

/**
 * Finds every project with 2+ quotes waiting, nobody selected yet, no
 * reminder sent before, and enough time passed since the most recent
 * quote — sends one, and stamps `quoteReminderSentAt` so it never sends
 * twice. Pure logic + a database write, no scheduling built in: this is
 * what a periodic job (Phase 15's cron endpoint, `src/app/api/cron/
 * quote-reminders/route.ts`) calls, not something that runs itself.
 */
export async function sendPendingQuoteReminders(): Promise<{ sent: number }> {
  const cutoff = new Date(Date.now() - WAIT_HOURS * 60 * 60 * 1000);

  const candidates = await prisma.project.findMany({
    where: {
      quoteReminderSentAt: null,
      quoteRequests: { none: { selected: true } },
    },
    include: {
      homeowner: true,
      quoteRequests: { where: { status: QuoteRequestStatus.QUOTED } },
    },
  });

  let sent = 0;
  for (const project of candidates) {
    const quoted = project.quoteRequests;
    if (quoted.length < MIN_QUOTES) continue;

    const lastRespondedAt = quoted.reduce<Date | null>((latest, qr) => {
      if (!qr.respondedAt) return latest;
      return !latest || qr.respondedAt > latest ? qr.respondedAt : latest;
    }, null);
    if (!lastRespondedAt || lastRespondedAt > cutoff) continue;

    await notifyQuotesWaiting({
      homeownerEmail: project.homeowner.email,
      homeownerName: project.homeowner.name,
      projectId: project.id,
      projectTitle: project.title,
      quoteCount: quoted.length,
    });

    await prisma.project.update({ where: { id: project.id }, data: { quoteReminderSentAt: new Date() } });
    await prisma.activityLog.create({
      data: { type: "quote_reminder_sent", projectId: project.id, metadata: { quoteCount: quoted.length } },
    });

    sent += 1;
  }

  return { sent };
}
