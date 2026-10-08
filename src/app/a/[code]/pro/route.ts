import type { NextRequest } from "next/server";
import { affiliateProLandingPath } from "@/lib/affiliate";
import { affiliateVisit } from "@/lib/affiliate-landing";

/**
 * A partner's link for tradespeople (/a/<slug>/pro): remembers the partner,
 * then lands on the professional sign-up. A professional who creates an
 * account in this browser is attributed to the partner (see
 * stampProfessionalSignupWithAffiliate).
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/a/[code]/pro">) {
  const { code } = await ctx.params;
  return affiliateVisit(request, code, affiliateProLandingPath, "/signup?role=professional");
}
