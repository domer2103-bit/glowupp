import { findReferrerByCode } from "@/lib/data/private-pipeline";
import { normalizeReferralCode } from "@/lib/referral";
import { referralRedirect } from "@/lib/referral-landing";

export async function GET(_request: Request, ctx: RouteContext<"/q/[code]">) {
  const { code } = await ctx.params;
  const referrer = await findReferrerByCode(code);
  return referralRedirect(referrer ? normalizeReferralCode(code) : null);
}
