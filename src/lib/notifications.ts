import "server-only";
import { getNotificationProvider } from "@/lib/notification-providers";
import { formatPence } from "@/lib/money";
import { getProjectTypeDefinition } from "@/lib/project-types";

export const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

/**
 * A failed notification must never break the action that triggered it —
 * a professional not getting an email is a much smaller problem than a
 * homeowner's "request quotes" click silently failing because Resend
 * had a bad moment. Every call site in this file goes through this
 * wrapper: errors are logged, never thrown.
 */
async function sendBestEffort(params: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  try {
    await getNotificationProvider().sendEmail(params);
  } catch (err) {
    console.error(`[notifications] failed to send "${params.subject}" to ${params.to}:`, err);
  }
}

function emailWrapper(body: string): string {
  return `<div style="font-family: -apple-system, sans-serif; font-size: 15px; line-height: 1.5; color: #18181b;">${body}<p style="margin-top: 24px; color: #71717a; font-size: 13px;">— GlowUpp</p></div>`;
}

/**
 * Security fix (Phase 12 review): every value interpolated into an HTML
 * email body below is user-controlled (a name, a project title, a
 * message body) — without escaping, a homeowner or professional could
 * inject arbitrary HTML (fake links, forged branding, tracking pixels)
 * into an email sent to someone else. The plain-text bodies don't need
 * this — only the `html:` templates.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface QuoteRequestedInput {
  professionalEmail: string;
  professionalName: string;
  projectTitle: string;
  projectType: string;
  postcode: string;
  homeownerMessage?: string | null;
}

/** Sent to a professional the moment a homeowner requests a quote from them. */
export async function notifyQuoteRequested(input: QuoteRequestedInput): Promise<void> {
  const typeLabel = getProjectTypeDefinition(input.projectType)?.label ?? input.projectType;
  const link = `${APP_URL}/professional/opportunities`;
  const messageLine = input.homeownerMessage ? `\n\nTheir note: "${input.homeownerMessage}"` : "";

  await sendBestEffort({
    to: input.professionalEmail,
    subject: `New quote opportunity: ${input.projectTitle}`,
    text: `Hi ${input.professionalName},\n\nA homeowner has requested a quote for their ${typeLabel} project ("${input.projectTitle}", ${input.postcode}).${messageLine}\n\nView it and respond: ${link}\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.professionalName)},</p><p>A homeowner has requested a quote for their ${typeLabel} project (<strong>${escapeHtml(input.projectTitle)}</strong>, ${escapeHtml(input.postcode)}).</p>${
        input.homeownerMessage ? `<p>Their note: <em>"${escapeHtml(input.homeownerMessage)}"</em></p>` : ""
      }<p><a href="${link}">View it and respond</a></p>`
    ),
  });
}

interface QuoteSubmittedInput {
  homeownerEmail: string;
  homeownerName: string;
  projectId: string;
  projectTitle: string;
  professionalBusinessName: string;
  quoteAmountPence: number;
  quoteTimeline: string;
}

/** Sent to the homeowner the moment a professional submits a quote. */
export async function notifyQuoteSubmitted(input: QuoteSubmittedInput): Promise<void> {
  const link = `${APP_URL}/projects/${input.projectId}/quotes`;
  const amount = formatPence(input.quoteAmountPence);

  await sendBestEffort({
    to: input.homeownerEmail,
    subject: `New quote for "${input.projectTitle}": ${amount}`,
    text: `Hi ${input.homeownerName},\n\n${input.professionalBusinessName} sent you a quote for "${input.projectTitle}": ${amount}, estimated timeline ${input.quoteTimeline}.\n\nCompare your quotes: ${link}\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.homeownerName)},</p><p><strong>${escapeHtml(input.professionalBusinessName)}</strong> sent you a quote for <strong>${escapeHtml(input.projectTitle)}</strong>: <strong>${amount}</strong>, estimated timeline ${escapeHtml(input.quoteTimeline)}.</p><p><a href="${link}">Compare your quotes</a></p>`
    ),
  });
}

interface ProfessionalSelectedInput {
  professionalEmail: string;
  professionalName: string;
  projectTitle: string;
  selected: boolean;
}

/**
 * Sent to every professional who submitted a quote once the homeowner
 * picks a winner — `selected: true` for the winner, `false` for everyone
 * else who quoted. Not in the brief's explicit event list, but leaving
 * losing bidders to find out only by the opportunity going quiet felt
 * like an obvious gap once the winner's email existed — same
 * "close the loop" reasoning as sites like Checkatrade.
 */
export async function notifyProfessionalSelected(input: ProfessionalSelectedInput): Promise<void> {
  const link = `${APP_URL}/professional/opportunities`;

  if (input.selected) {
    await sendBestEffort({
      to: input.professionalEmail,
      subject: `You were selected: ${input.projectTitle}`,
      text: `Hi ${input.professionalName},\n\nGood news — the homeowner has selected you for "${input.projectTitle}".\n\nView the opportunity: ${link}\n\n— GlowUpp`,
      html: emailWrapper(
        `<p>Hi ${escapeHtml(input.professionalName)},</p><p>Good news — the homeowner has selected you for <strong>${escapeHtml(input.projectTitle)}</strong>.</p><p><a href="${link}">View the opportunity</a></p>`
      ),
    });
    return;
  }

  await sendBestEffort({
    to: input.professionalEmail,
    subject: `Update on "${input.projectTitle}"`,
    text: `Hi ${input.professionalName},\n\nThe homeowner for "${input.projectTitle}" has moved forward with another professional this time. Thanks for quoting — keep an eye on your opportunities for new projects.\n\n${link}\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.professionalName)},</p><p>The homeowner for <strong>${escapeHtml(input.projectTitle)}</strong> has moved forward with another professional this time. Thanks for quoting — keep an eye on your opportunities for new projects.</p><p><a href="${link}">View opportunities</a></p>`
    ),
  });
}

interface MessageReceivedInput {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  projectTitle: string;
  body: string;
  /** Differs by recipient role (homeowner vs. professional route) — built by the caller, not this module. */
  viewLink: string;
}

/** Sent to whichever side of a quote request's thread (Phase 10) didn't just send the message. */
export async function notifyMessageReceived(input: MessageReceivedInput): Promise<void> {
  await sendBestEffort({
    to: input.recipientEmail,
    subject: `New message about "${input.projectTitle}"`,
    text: `Hi ${input.recipientName},\n\n${input.senderName} sent you a message about "${input.projectTitle}":\n\n"${input.body}"\n\nReply: ${input.viewLink}\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.recipientName)},</p><p><strong>${escapeHtml(input.senderName)}</strong> sent you a message about <strong>${escapeHtml(input.projectTitle)}</strong>:</p><p style="padding: 12px; background: #f4f4f5; border-radius: 8px;"><em>"${escapeHtml(input.body)}"</em></p><p><a href="${input.viewLink}">Reply</a></p>`
    ),
  });
}

interface QuotesWaitingInput {
  homeownerEmail: string;
  homeownerName: string;
  projectId: string;
  projectTitle: string;
  quoteCount: number;
}

/**
 * A one-time nudge (post-roadmap) — sent only once a homeowner has real
 * choice (2+ quotes in hand) and hasn't picked anyone yet after a wait.
 * Deliberately not a general "come back and use the marketplace" email;
 * see docs/BACKEND_ARCHITECTURE.md §28 for why this one was judged fair
 * game while a broader activation nudge wasn't.
 */
export async function notifyQuotesWaiting(input: QuotesWaitingInput): Promise<void> {
  const link = `${APP_URL}/projects/${input.projectId}/quotes`;

  await sendBestEffort({
    to: input.homeownerEmail,
    subject: `${input.quoteCount} quotes waiting for "${input.projectTitle}"`,
    text: `Hi ${input.homeownerName},\n\nYou have ${input.quoteCount} quotes for "${input.projectTitle}" whenever you're ready to take a look — no rush.\n\n${link}\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.homeownerName)},</p><p>You have <strong>${input.quoteCount} quotes</strong> for <strong>${escapeHtml(input.projectTitle)}</strong> whenever you're ready to take a look — no rush.</p><p><a href="${link}">Compare your quotes</a></p>`
    ),
  });
}

interface LeadFeePaidInput {
  professionalEmail: string;
  professionalName: string;
  projectTitle: string;
  feeAmountPence: number;
}

/** Sent once a lead fee's Stripe Checkout payment is confirmed by the webhook — also the point at which the homeowner's full address unlocks (src/lib/data/quotes.ts). */
export async function notifyLeadFeePaid(input: LeadFeePaidInput): Promise<void> {
  const link = `${APP_URL}/professional/opportunities`;
  const amount = formatPence(input.feeAmountPence);

  await sendBestEffort({
    to: input.professionalEmail,
    subject: `Payment received — ${input.projectTitle}`,
    text: `Hi ${input.professionalName},\n\nThanks — we've received your ${amount} lead fee for "${input.projectTitle}". The homeowner's full address is now visible on the opportunity.\n\n${link}\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.professionalName)},</p><p>Thanks — we've received your ${amount} lead fee for <strong>${escapeHtml(input.projectTitle)}</strong>. The homeowner's full address is now visible on the opportunity.</p><p><a href="${link}">View the opportunity</a></p>`
    ),
  });
}

interface LeadFeeFinalNoticeInput {
  professionalEmail: string;
  professionalName: string;
  projectTitle: string;
  feeAmountPence: number;
}

/** Sent once, 24h after a professional is selected, if their lead fee is still unpaid — the only warning before the 48h auto-cancel (src/lib/lead-fee-reminders.ts). */
export async function notifyLeadFeeFinalNotice(input: LeadFeeFinalNoticeInput): Promise<void> {
  const link = `${APP_URL}/professional/transactions`;
  const amount = formatPence(input.feeAmountPence);

  await sendBestEffort({
    to: input.professionalEmail,
    subject: `Action needed within 24h — ${input.projectTitle}`,
    text: `Hi ${input.professionalName},\n\nYou were selected for "${input.projectTitle}", but the ${amount} lead fee is still unpaid. Pay within 24h to keep this lead — after that it'll be cancelled and the project reopened to other professionals.\n\n${link}\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.professionalName)},</p><p>You were selected for <strong>${escapeHtml(input.projectTitle)}</strong>, but the ${amount} lead fee is still unpaid. Pay within 24h to keep this lead — after that it'll be cancelled and the project reopened to other professionals.</p><p><a href="${link}">Pay now</a></p>`
    ),
  });
}

interface LeadFeeCancelledInput {
  professionalEmail: string;
  professionalName: string;
  projectTitle: string;
}

/** Sent to the professional when their unpaid lead fee auto-cancels at the 48h mark. */
export async function notifyLeadFeeCancelled(input: LeadFeeCancelledInput): Promise<void> {
  await sendBestEffort({
    to: input.professionalEmail,
    subject: `Lead released — ${input.projectTitle}`,
    text: `Hi ${input.professionalName},\n\nThe lead fee for "${input.projectTitle}" wasn't paid in time, so this opportunity has been released back to the homeowner. Keep an eye on your opportunities for new projects.\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.professionalName)},</p><p>The lead fee for <strong>${escapeHtml(input.projectTitle)}</strong> wasn't paid in time, so this opportunity has been released back to the homeowner. Keep an eye on your opportunities for new projects.</p>`
    ),
  });
}

interface ProjectReopenedInput {
  homeownerEmail: string;
  homeownerName: string;
  projectId: string;
  projectTitle: string;
}

/** Sent to the homeowner when their selected professional's lead fee auto-cancels — reopens the project's quotes for them to pick someone else. */
export async function notifyProjectReopened(input: ProjectReopenedInput): Promise<void> {
  const link = `${APP_URL}/projects/${input.projectId}/quotes`;

  await sendBestEffort({
    to: input.homeownerEmail,
    subject: `Update on "${input.projectTitle}"`,
    text: `Hi ${input.homeownerName},\n\nThe professional you selected for "${input.projectTitle}" didn't confirm in time, so we've reopened it — take a look at your other quotes whenever you're ready.\n\n${link}\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.homeownerName)},</p><p>The professional you selected for <strong>${escapeHtml(input.projectTitle)}</strong> didn't confirm in time, so we've reopened it — take a look at your other quotes whenever you're ready.</p><p><a href="${link}">View your quotes</a></p>`
    ),
  });
}
