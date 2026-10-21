import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ATTRIBUTION_COOKIE } from "@/lib/attribution-cookie";
import { attributionLabel, decodeAttribution } from "@/lib/attribution";

/** ActivityLog.type for "this account was created, and this is where the visitor first came from". */
export const SIGNUP_SOURCE_ACTIVITY = "SIGNUP_SOURCE";

/**
 * Writes one SIGNUP_SOURCE row for a new account: the first-touch source the
 * visitor arrived with (utm_* tags or referring site), or "direct" when there
 * was none. Reporting is a plain query on activity_log (see
 * docs/ATTRIBUTION.md). Never throws: counting a signup's source must not be
 * able to break signing up.
 */
export async function recordSignupSource(userId: string, role: string): Promise<void> {
  try {
    const jar = await cookies();
    const attribution = decodeAttribution(jar.get(ATTRIBUTION_COOKIE)?.value);
    await prisma.activityLog.create({
      data: {
        type: SIGNUP_SOURCE_ACTIVITY,
        actorId: userId,
        metadata: { label: attributionLabel(attribution), role, ...(attribution ?? {}) },
      },
    });
  } catch (err) {
    console.error("[attribution] could not record signup source", err);
  }
}
