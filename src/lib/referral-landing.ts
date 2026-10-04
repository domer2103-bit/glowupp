import "server-only";
import { NextResponse } from "next/server";
import { PRO_REF_COOKIE, PRO_REF_MAX_AGE_SECONDS } from "@/lib/private-pipeline-cookie";

/**
 * Shared by /q/[code] and /pro/[slug]/quote. Remembers which contractor
 * sent this visitor (httpOnly cookie, so the server — not editable
 * client JS — decides which pipeline a new project joins) and drops them
 * on the category chooser. Uses a relative Location header so the redirect
 * is correct behind the reverse proxy regardless of the internal host.
 *
 * An unknown/rejected code gets the same redirect with no cookie. (The
 * cookie's presence does show a code is valid, which is acceptable: codes
 * are 32^8 possibilities and are handed out publicly on QR codes anyway.)
 */
export function referralRedirect(referralCode: string | null): NextResponse {
  const res = new NextResponse(null, { status: 307, headers: { Location: "/#categories" } });
  if (referralCode) {
    res.cookies.set(PRO_REF_COOKIE, referralCode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PRO_REF_MAX_AGE_SECONDS,
    });
  }
  res.headers.set("Cache-Control", "no-store");
  return res;
}
