"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireQuoteRequestAccess } from "@/lib/data/quotes";
import { notifyMessageReceived, APP_URL } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { containsLikelyContactInfo } from "@/lib/contact-info";
import { QuoteRequestStatus } from "@/generated/prisma/client";

export type ActionState = { error?: string; info?: string } | undefined;

const SendMessageSchema = z.object({
  body: z.string().trim().min(1, "Write a message before sending.").max(4000, "Message is too long."),
});

/**
 * Either side of a quote request's thread can send — the homeowner or
 * the professional it was sent to (`requireQuoteRequestAccess` covers
 * both). Blocked once the professional has declined: there's nothing
 * left to discuss on a closed-out opportunity, same reasoning as why
 * `submitQuote` refuses on a declined request.
 */
export async function sendMessage(quoteRequestId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { quoteRequest, viewerRole } = await requireQuoteRequestAccess(quoteRequestId);

  if (quoteRequest.status === QuoteRequestStatus.DECLINED) {
    return { error: "This opportunity was declined — the thread is closed." };
  }

  const parsed = SendMessageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };

  const senderId = viewerRole === "HOMEOWNER" ? quoteRequest.homeownerId : quoteRequest.professional.userId;

  if (!checkRateLimit(`message:${senderId}`, 20, 10 * 60 * 1000)) {
    return { error: "You're sending messages too quickly — please slow down." };
  }

  await prisma.message.create({
    data: { quoteRequestId, senderId, body: parsed.data.body },
  });

  await prisma.activityLog.create({
    data: { type: "message_sent", actorId: senderId, projectId: quoteRequest.projectId, metadata: { quoteRequestId } },
  });

  if (viewerRole === "HOMEOWNER") {
    await notifyMessageReceived({
      recipientEmail: quoteRequest.professional.user.email,
      recipientName: quoteRequest.professional.user.name,
      senderName: quoteRequest.homeowner.name,
      projectTitle: quoteRequest.project.title,
      body: parsed.data.body,
      viewLink: `${APP_URL}/professional/opportunities/${quoteRequestId}`,
    });
  } else {
    await notifyMessageReceived({
      recipientEmail: quoteRequest.homeowner.email,
      recipientName: quoteRequest.homeowner.name,
      senderName: quoteRequest.professional.businessName,
      projectTitle: quoteRequest.project.title,
      body: parsed.data.body,
      viewLink: `${APP_URL}/projects/${quoteRequest.projectId}/quotes/${quoteRequestId}`,
    });
  }

  revalidatePath(`/projects/${quoteRequest.projectId}/quotes/${quoteRequestId}`);
  revalidatePath(`/professional/opportunities/${quoteRequestId}`);

  // Never blocks sending — just a soft, dismissible-by-ignoring reminder.
  // Keeping the whole conversation in GlowUpp protects both sides (message
  // history, no lost details) and keeps the lead-fee arrangement honest.
  if (containsLikelyContactInfo(parsed.data.body)) {
    return { info: "Heads up — for your own record and protection, quotes and next steps work best kept inside GlowUpp." };
  }

  return undefined;
}
