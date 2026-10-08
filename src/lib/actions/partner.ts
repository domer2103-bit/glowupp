"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { buildDashboardLink, PARTNER_COOKIE } from "@/lib/partner-session";
import { findPartnerByEmail, getCurrentPartner, issuePartnerLoginToken, markPartnerNoticesSeen, revokePartnerLoginToken } from "@/lib/data/affiliates";
import { APP_URL, notifyPartnerLoginLink } from "@/lib/notifications";

export type PartnerActionState = { error?: string; info?: string } | undefined;

const HOUR_MS = 60 * 60 * 1000;

/**
 * "Email me a new sign-in link" (/partner/login). Always gives the same
 * answer whether or not the address has an account, so the form cannot be
 * used to find out who is a partner; sending is rate-limited per address
 * (each request sends an email, so it must not be spammable) and per IP.
 */
export async function requestPartnerLoginLink(_prev: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const parsed = z.string().trim().toLowerCase().email().max(120).safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter the email address you signed up with." };

  if (!checkRateLimit(`partner-login-ip:${await getClientIp()}`, 10, HOUR_MS)) return { error: "Too many attempts — please try again in an hour." };

  const answer: PartnerActionState = { info: "If that email has a partner account, we've just sent a sign-in link to it. Check your inbox." };
  if (!checkRateLimit(`partner-link:${parsed.data}`, 3, HOUR_MS)) return answer;

  const partner = await findPartnerByEmail(parsed.data);
  if (partner) {
    const token = await issuePartnerLoginToken(partner.id);
    await notifyPartnerLoginLink({ email: partner.email, contactName: partner.contactName, dashboardLink: buildDashboardLink(APP_URL, token) });
  }
  return answer;
}

/** Signs this browser out of the partner dashboard and retires the token it was using (other devices stay signed in). */
export async function partnerSignOut(): Promise<void> {
  const jar = await cookies();
  await revokePartnerLoginToken(jar.get(PARTNER_COOKIE)?.value);
  jar.delete(PARTNER_COOKIE);
  redirect("/partner/login");
}

/** "Got it" on the dashboard pop-up: the signed-in partner has read their new notices, so they are not shown as a pop-up again (they stay in the Updates list). */
export async function dismissPartnerNotices(): Promise<void> {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/partner/login");
  await markPartnerNoticesSeen(partner.id);
  revalidatePath("/partner/dashboard");
}
