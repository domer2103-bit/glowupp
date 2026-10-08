import { NextResponse, type NextRequest } from "next/server";
import { AFFILIATE_COOKIE, AFFILIATE_MAX_AGE_SECONDS } from "@/lib/affiliate-cookie";
import { affiliateLandingPath } from "@/lib/affiliate";
import { findActiveAffiliate, recordAffiliateClick } from "@/lib/data/affiliates";

/**
 * Entry point for a B2B affiliate partner's printed QR / shared link
 * (/a/<slug> or /a/<8-char code>). Remembers which partner sent the
 * visitor (httpOnly cookie — first partner wins for 30 days, so a later
 * scan of someone else's QR can't steal the credit) and drops them on the
 * category chooser, tagged with UTM parameters so Plausible shows which
 * partner the visit came from. Relative Location header, like /q/[code], so
 * the redirect is right behind the reverse proxy.
 *
 * An unknown, malformed or suspended code gets the plain redirect and no
 * cookie, so a stale QR on a café table still lands people on the site.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/a/[code]">) {
  const { code } = await ctx.params;

  let partner: Awaited<ReturnType<typeof findActiveAffiliate>> = null;
  let keepExisting = false;
  try {
    partner = await findActiveAffiliate(code);
    if (partner) {
      const existing = request.cookies.get(AFFILIATE_COOKIE)?.value;
      keepExisting = existing ? (await findActiveAffiliate(existing)) !== null : false;
      await recordAffiliateClick(partner.id);
    }
  } catch (err) {
    console.error("[affiliate] link lookup failed:", err);
    partner = null;
  }

  const res = new NextResponse(null, { status: 307, headers: { Location: partner ? affiliateLandingPath(partner.qrSlug) : "/#categories" } });
  if (partner && !keepExisting) {
    res.cookies.set(AFFILIATE_COOKIE, partner.qrSlug, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: AFFILIATE_MAX_AGE_SECONDS,
    });
  }
  res.headers.set("Cache-Control", "no-store");
  return res;
}
