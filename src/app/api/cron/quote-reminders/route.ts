import { NextRequest, NextResponse } from "next/server";
import { sendPendingQuoteReminders } from "@/lib/reminders";

/**
 * Meant to be hit periodically by an external scheduler (Hostinger's own
 * cron, or a service like cron-job.org) once deployed — nothing in this
 * app triggers this on its own. Not wired up to an actual schedule yet;
 * that's the one deployment-dependent piece of this feature (see
 * docs/BACKEND_ARCHITECTURE.md §28).
 *
 * Accepts the shared secret as either a header (`x-cron-secret`) or a
 * `?secret=` query param, since some simple external cron pingers can
 * only hit a plain URL and can't set custom headers.
 */
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided = request.headers.get("x-cron-secret") ?? request.nextUrl.searchParams.get("secret");
  return provided === expected;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendPendingQuoteReminders();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
