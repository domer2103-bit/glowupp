import { findReferrerBySlug } from "@/lib/data/private-pipeline";
import { referralRedirect } from "@/lib/referral-landing";

export async function GET(_request: Request, ctx: RouteContext<"/pro/[slug]/quote">) {
  const { slug } = await ctx.params;
  const referrer = await findReferrerBySlug(slug);
  return referralRedirect(referrer?.referralCode ?? null);
}
