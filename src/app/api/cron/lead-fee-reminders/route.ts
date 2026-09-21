import { NextRequest, NextResponse } from "next/server";
import { processPendingLeadFees } from "@/lib/lead-fee-reminders";

/** Same auth pattern as /api/cron/quote-reminders — shared secret via header or query param. */
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
  const result = await processPendingLeadFees();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
