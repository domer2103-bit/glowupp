import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { buildAffiliateLink } from "@/lib/affiliate";
import { PARTNER_COOKIE, PARTNER_SESSION_MAX_AGE_SECONDS, buildDashboardLink } from "@/lib/partner-session";
import { PARTNER_TERMS_VERSION, PartnerSignupSchema, isSameOrigin, parseCheckbox, publicCategoryToDb } from "@/lib/partner-signup";
import { issuePartnerLoginToken, registerSelfServePartner } from "@/lib/data/affiliates";
import { APP_URL, notifyPartnerLoginLink, notifyPartnerWelcome } from "@/lib/notifications";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Public self-service sign-up for B2B partners (the /partner/join form).
 * Accepts the browser's JSON `fetch` (inline errors) and a plain HTML form
 * POST (works without JavaScript; answers with a redirect). Fields are named
 * as in the brief: business_name, contact_name, email, phone, category.
 *
 * Because it is public and creates accounts that earn money, it is guarded:
 * same-origin only, a per-IP rate limit, a honeypot field, one account per
 * email, and — crucially — signing someone in only happens for a BRAND NEW
 * account. Submitting an email that already has an account never signs the
 * visitor in (anyone can type anyone's email); it emails the real owner a
 * fresh link instead.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const wantsJson = (req.headers.get("content-type") ?? "").includes("application/json");
  const reply = (status: number, error: string, code: "invalid" | "busy" | "origin") =>
    wantsJson
      ? NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } })
      : new NextResponse(null, { status: 303, headers: { Location: `/partner/join?error=${code}`, "Cache-Control": "no-store" } });
  const done = (path: string) =>
    wantsJson
      ? NextResponse.json({ ok: true, redirect: path }, { headers: { "Cache-Control": "no-store" } })
      : new NextResponse(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } });

  if (!isSameOrigin(req.headers.get("origin"), [req.headers.get("host"), req.headers.get("x-forwarded-host"), new URL(APP_URL).host])) return reply(403, "This form can only be submitted from glowupp.co.uk.", "origin");
  if (!checkRateLimit(`partner-join:${await getClientIp()}`, 5, HOUR_MS)) return reply(429, "Too many attempts — please try again in an hour.", "busy");

  let raw: Record<string, unknown>;
  try {
    raw = wantsJson ? await req.json() : Object.fromEntries((await req.formData()).entries());
  } catch {
    return reply(400, "We couldn't read that form. Please try again.", "invalid");
  }
  const field = (snake: string, camel: string) => raw[snake] ?? raw[camel];

  // Honeypot: real visitors never see or fill this field. Pretend it worked.
  if (typeof raw.website === "string" && raw.website.trim() !== "") return done("/partner/success?existing=1");

  const parsed = PartnerSignupSchema.safeParse({
    businessName: field("business_name", "businessName"),
    contactName: field("contact_name", "contactName"),
    email: field("email", "email"),
    phone: field("phone", "phone"),
    category: field("category", "category"),
    acceptTerms: parseCheckbox(field("accept_terms", "acceptTerms")),
  });
  if (!parsed.success) return reply(400, parsed.error.issues[0]?.message ?? "Please check your details and try again.", "invalid");
  const input = parsed.data;

  const result = await registerSelfServePartner({
    businessName: input.businessName,
    contactName: input.contactName,
    email: input.email,
    phone: input.phone,
    category: publicCategoryToDb(input.category),
    termsAcceptedAt: new Date(),
    termsVersion: PARTNER_TERMS_VERSION,
  });

  if (result.kind === "exists") {
    // Existing account: email its owner a fresh link (at most 3 an hour per address), and sign nobody in.
    if (checkRateLimit(`partner-link:${input.email}`, 3, HOUR_MS)) {
      const partner = await prisma.affiliatePartner.findUniqueOrThrow({ where: { id: result.partnerId }, select: { email: true, contactName: true } });
      const token = await issuePartnerLoginToken(result.partnerId);
      await notifyPartnerLoginLink({ email: partner.email, contactName: partner.contactName, dashboardLink: buildDashboardLink(APP_URL, token) });
    }
    return done("/partner/success?existing=1");
  }

  const { partner, token } = result;
  await prisma.activityLog.create({
    data: { type: "affiliate_partner_self_registered", metadata: { partnerId: partner.id, businessName: partner.businessName, category: partner.category } },
  });
  await notifyPartnerWelcome({
    email: partner.email,
    contactName: partner.contactName,
    businessName: partner.businessName,
    trackingLink: buildAffiliateLink(APP_URL, partner.qrSlug),
    dashboardLink: buildDashboardLink(APP_URL, token),
    sharePercent: Math.round(partner.revenueShareRate.toNumber() * 100),
  });

  const res = done("/partner/success");
  res.cookies.set(PARTNER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PARTNER_SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
