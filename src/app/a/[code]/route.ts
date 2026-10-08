import type { NextRequest } from "next/server";
import { affiliateLandingPath } from "@/lib/affiliate";
import { affiliateVisit } from "@/lib/affiliate-landing";

/** A partner's printed QR / shared link for homeowners (/a/<slug> or /a/<8-char code>): see affiliateVisit. */
export async function GET(request: NextRequest, ctx: RouteContext<"/a/[code]">) {
  const { code } = await ctx.params;
  return affiliateVisit(request, code, affiliateLandingPath, "/#categories");
}
