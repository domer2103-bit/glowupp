import { NextResponse, type NextRequest } from "next/server";
import { findPartnerByLoginToken } from "@/lib/data/affiliates";
import { PARTNER_COOKIE, PARTNER_SESSION_MAX_AGE_SECONDS } from "@/lib/partner-session";

/**
 * Swaps a magic link (/partner/dashboard?token=…, from the partner's email)
 * for a signed-in session cookie and redirects to the clean dashboard URL, so
 * the token does not stay in the address bar, browser history or a
 * screenshot. The token goes into an httpOnly cookie, never into the page.
 * An unknown or expired token lands on the "send me a new link" page.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const partner = await findPartnerByLoginToken(token);
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: partner ? "/partner/dashboard" : "/partner/login?error=expired", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
  if (partner && token) {
    res.cookies.set(PARTNER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PARTNER_SESSION_MAX_AGE_SECONDS,
    });
  }
  return res;
}
