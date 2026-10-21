import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE } from "@/lib/guest-cookie";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE_SECONDS } from "@/lib/attribution-cookie";
import { encodeAttribution, parseAttribution } from "@/lib/attribution";

/**
 * Refreshes the Supabase session cookie on every request. Next.js 16
 * renamed `middleware.ts` to `proxy.ts` (same mechanism, new name/export) —
 * see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
 *
 * This is a session refresh only, not the authorization boundary — it does
 * not gate access to any route. Page-level and server-action-level checks
 * (src/lib/auth.ts) are what actually enforce who can see what.
 *
 * Also mints an anonymous guest-session cookie (src/lib/guest.ts) so the
 * login-free redesign wizard has an id to work with on a visitor's very
 * first request — a Server Component can only *read* cookies, never set
 * one, so this has to happen here rather than in the wizard page itself.
 *
 * Also remembers, first visit wins for 30 days, where a visitor came from
 * (utm_* tags or an outside referring site — src/lib/attribution.ts) so
 * signup() can credit a new account to a post or channel.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touches the session so an expired access token gets refreshed before
  // it reaches a Server Component.
  await supabase.auth.getUser();

  if (!request.cookies.has(GUEST_COOKIE)) {
    response.cookies.set(GUEST_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (!request.cookies.has(ATTRIBUTION_COOKIE) && request.method === "GET") {
    const attribution = parseAttribution(request.nextUrl, request.headers.get("referer"));
    if (attribution) {
      response.cookies.set(ATTRIBUTION_COOKIE, encodeAttribution(attribution), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: ATTRIBUTION_MAX_AGE_SECONDS,
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
  ],
};
