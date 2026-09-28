"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export type ActionState = { error?: string; success?: boolean } | undefined;

const WaitlistSchema = z.object({
  email: z.email("Enter a valid email address."),
  source: z.string().trim().max(200).optional(),
});

/** Public, unauthenticated: captures interest ahead of launch (src/app/launch). Re-submitting the same email is treated as success, not an error — someone clicking the link twice shouldn't see a failure. */
export async function joinWaitlist(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`waitlist:${ip}`, 5, 60 * 60 * 1000)) {
    return { error: "Too many attempts from this location — please try again later." };
  }

  const parsed = WaitlistSchema.safeParse({
    email: formData.get("email"),
    source: formData.get("source") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  await prisma.waitlistSignup.upsert({
    where: { email: parsed.data.email.toLowerCase() },
    create: { email: parsed.data.email.toLowerCase(), source: parsed.data.source },
    update: {},
  });

  return { success: true };
}
