import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { AFFILIATE_COOKIE, AFFILIATE_MAX_AGE_SECONDS } from "@/lib/affiliate-cookie";
import { findActiveAffiliate, recordAffiliateClick } from "@/lib/data/affiliates";

/**
 * Shared by /a/[code] (homeowners) and /a/[code]/pro (tradespeople).
 * Remembers which partner sent the visitor (httpOnly cookie — first partner
 * wins for 30 days, so a later scan of someone else's QR can't steal the
 * credit), counts the click, and redirects to `landingPath(slug)`: the page
 * the visitor should see, tagged with UTM parameters so Plausible shows which
 * partner the visit came from. Relative Location header, like /q/[code], so
 * the redirect is right behind the reverse proxy.
 *
 * An unknown, malformed or suspended code gets a plain redirect and no
 * cookie, so a stale QR on a café table still lands people on the site.
 */
export async function affiliateVisit(request: NextRequest, code: string, landingPath: (qrSlug: string) => string, fallbackPath: string): Promise<NextResponse> {
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

  const res = new NextResponse(null, { status: 307, headers: { Location: partner ? landingPath(partner.qrSlug) : fallbackPath } });
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
