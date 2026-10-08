import "server-only";
import { getNotificationProvider } from "@/lib/notification-providers";
import { formatPence } from "@/lib/money";
import { getProjectTypeDefinition } from "@/lib/project-types";
import { noFeeNoticeMessage, PRO_REFERRAL_EARNING_MONTHS } from "@/lib/affiliate";

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

interface OpenMarketProjectInput {
  professionalEmail: string;
  professionalName: string;
  projectTitle: string;
  projectType: string;
  postcode: string;
}

/**
 * Sent once, in a batch, to every professional who matches (type + area)
 * at the moment a homeowner pushes their project to the open market —
 * not re-sent as new professionals sign up later, and not sent again if
 * the project is already open. Tells them where to look; it doesn't
 * commit them to anything, unlike the old per-professional invite email
 * this replaces.
 */
export async function notifyOpenMarketProject(input: OpenMarketProjectInput): Promise<void> {
  const typeLabel = getProjectTypeDefinition(input.projectType)?.label ?? input.projectType;
  const link = `${APP_URL}/professional/open-projects`;

  await sendBestEffort({
    to: input.professionalEmail,
    subject: `New ${typeLabel} project in ${input.postcode}`,
    text: `Hi ${input.professionalName},\n\nA new ${typeLabel} project just went live in your area ("${input.projectTitle}", ${input.postcode}). Take a look and send a quote if it's a fit.\n\n${link}\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.professionalName)},</p><p>A new ${typeLabel} project just went live in your area (<strong>${escapeHtml(input.projectTitle)}</strong>, ${escapeHtml(input.postcode)}). Take a look and send a quote if it's a fit.</p><p><a href="${link}">View open projects</a></p>`
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

interface PrivateEstimateRequestedInput {
  professionalEmail: string;
  professionalName: string;
  projectTitle: string;
}

/** Sent to the contractor when a client in their private pipeline sends a render and asks for an official estimate. */
export async function notifyPrivateEstimateRequested(input: PrivateEstimateRequestedInput): Promise<void> {
  const link = `${APP_URL}/professional/pipeline?tab=leads`;
  await sendBestEffort({
    to: input.professionalEmail,
    subject: `Estimate requested: "${input.projectTitle}"`,
    text: `Hi ${input.professionalName},\n\nA client from your private design portal has sent you their render for "${input.projectTitle}" and asked for an official estimate.\n\nView it and send your quote: ${link}\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.professionalName)},</p><p>A client from your private design portal sent you their render for <strong>${escapeHtml(input.projectTitle)}</strong> and asked for an official estimate.</p><p><a href="${link}">View it and send your quote</a></p>`
    ),
  });
}

interface PrivateQuoteSubmittedInput extends QuoteSubmittedInput {
  depositPence: number | null;
}

/** Sent to the homeowner when their contractor sends an itemised quote; mentions a deposit request if there is one. The deposit is paid directly to the contractor — GlowUpp never takes it. */
export async function notifyPrivateQuoteSubmitted(input: PrivateQuoteSubmittedInput): Promise<void> {
  const link = `${APP_URL}/projects/${input.projectId}/quotes`;
  const amount = formatPence(input.quoteAmountPence);
  const deposit = input.depositPence ? `${formatPence(input.depositPence)} deposit requested — arranged and paid directly with ${input.professionalBusinessName}, not through GlowUpp.` : "";

  await sendBestEffort({
    to: input.homeownerEmail,
    subject: `Your estimate from ${input.professionalBusinessName}: ${amount}`,
    text: `Hi ${input.homeownerName},\n\n${input.professionalBusinessName} sent your itemised estimate for "${input.projectTitle}": ${amount}, estimated timeline ${input.quoteTimeline}.${deposit ? `\n${deposit}` : ""}\n\nSee the full breakdown: ${link}\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.homeownerName)},</p><p><strong>${escapeHtml(input.professionalBusinessName)}</strong> sent your itemised estimate for <strong>${escapeHtml(input.projectTitle)}</strong>: <strong>${amount}</strong>, estimated timeline ${escapeHtml(input.quoteTimeline)}.</p>${deposit ? `<p>${escapeHtml(deposit)}</p>` : ""}<p><a href="${link}">See the full breakdown</a></p>`
    ),
  });
}

interface PartnerWelcomeInput {
  email: string;
  contactName: string;
  businessName: string;
  /** The partner's personal link/QR address for homeowners. */
  trackingLink: string;
  /** The partner's link for tradespeople (opens the professional sign-up). */
  proLink: string;
  /** Magic login link for the partner dashboard (contains the one-time-shown token). */
  dashboardLink: string;
  sharePercent: number;
}

/** Sent once when a business signs itself up at /partner/join: confirms the share, and carries the tracking link and the magic dashboard link (where the printable PDFs/PNGs are downloaded — they are rendered in the browser, not attached). */
export async function notifyPartnerWelcome(input: PartnerWelcomeInput): Promise<void> {
  const materials = `${input.dashboardLink}#materials`;
  await sendBestEffort({
    to: input.email,
    subject: `You're in — your GlowUpp partner link for ${input.businessName}`,
    text: `Hi ${input.contactName},\n\nWelcome to the GlowUpp partner programme — ${input.businessName} is all set up.\n\nOur agreement in short: you earn ${input.sharePercent}% of the lead fee GlowUpp collects on jobs booked by homeowners who start through your link or QR code, and on jobs won by tradespeople who sign up through your tradespeople link${PRO_REFERRAL_EARNING_MONTHS === null ? "" : ` (for ${PRO_REFERRAL_EARNING_MONTHS} months after they sign up)`}. Free introductory jobs and other promotions earn no share, because no fee is collected on them — we'll tell you when that happens. We'll be in touch to arrange payment of anything you've earned.\n\nYour personal link (this is what your QR code opens):\n${input.trackingLink}\n\nYour link for tradespeople:\n${input.proLink}\n\nDownload your poster, coaster and social graphic:\n${materials}\n\nYour live earnings dashboard:\n${input.dashboardLink}\n\nKeep this email: the dashboard link signs you in, so please don't forward it. If you lose it you can ask for a new one at ${APP_URL}/partner/login.\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.contactName)},</p>` +
        `<p>Welcome to the GlowUpp partner programme — <strong>${escapeHtml(input.businessName)}</strong> is all set up.</p>` +
        `<p><strong>Our agreement in short:</strong> you earn ${input.sharePercent}% of the lead fee GlowUpp collects on jobs booked by homeowners who start through your link or QR code, and on jobs won by tradespeople who sign up through your tradespeople link${PRO_REFERRAL_EARNING_MONTHS === null ? "" : ` (for ${PRO_REFERRAL_EARNING_MONTHS} months after they sign up)`}. Free introductory jobs and other promotions earn no share, because no fee is collected on them — we'll tell you when that happens. We'll be in touch to arrange payment of anything you've earned.</p>` +
        `<p>Your personal link (this is what your QR code opens):<br><a href="${escapeHtml(input.trackingLink)}">${escapeHtml(input.trackingLink)}</a></p><p>Your link for tradespeople:<br><a href="${escapeHtml(input.proLink)}">${escapeHtml(input.proLink)}</a></p>` +
        `<p><a href="${escapeHtml(materials)}" style="display:inline-block;background:#3a6694;color:#ffffff;padding:10px 18px;border-radius:999px;text-decoration:none;">Download your poster, coaster &amp; social graphic</a></p>` +
        `<p><a href="${escapeHtml(input.dashboardLink)}">Open your live earnings dashboard</a></p>` +
        `<p style="color:#71717a;font-size:13px;">Keep this email: the dashboard link signs you in, so please don't forward it. If you lose it you can ask for a new one at <a href="${APP_URL}/partner/login">${APP_URL}/partner/login</a>.</p>`
    ),
  });
}

interface PartnerLoginLinkInput {
  email: string;
  contactName: string;
  dashboardLink: string;
}

/** Sent when a partner asks for a new sign-in link (or re-submits the join form with an email that already has an account). */
export async function notifyPartnerLoginLink(input: PartnerLoginLinkInput): Promise<void> {
  await sendBestEffort({
    to: input.email,
    subject: "Your GlowUpp partner sign-in link",
    text: `Hi ${input.contactName},\n\nHere is your sign-in link for the GlowUpp partner dashboard:\n${input.dashboardLink}\n\nPlease don't forward it — anyone with it can see your dashboard. If you didn't ask for this, you can ignore this email.\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.contactName)},</p><p>Here is your sign-in link for the GlowUpp partner dashboard:</p>` +
        `<p><a href="${escapeHtml(input.dashboardLink)}" style="display:inline-block;background:#3a6694;color:#ffffff;padding:10px 18px;border-radius:999px;text-decoration:none;">Open my dashboard</a></p>` +
        `<p style="color:#71717a;font-size:13px;">Please don't forward it — anyone with it can see your dashboard. If you didn't ask for this, you can ignore this email.</p>`
    ),
  });
}

interface PartnerNoFeeJobInput {
  email: string;
  contactName: string;
  source: "HOMEOWNER" | "PROFESSIONAL";
  dashboardLink: string;
}

/** Sent when a job that came from a partner's link carried no fee (a free introductory job), so they know why it earned nothing. Names nobody. */
export async function notifyPartnerNoFeeJob(input: PartnerNoFeeJobInput): Promise<void> {
  const message = noFeeNoticeMessage(input.source);
  await sendBestEffort({
    to: input.email,
    subject: "A job from your GlowUpp link had no fee this time",
    text: `Hi ${input.contactName},\n\n${message}\n\nYou can see this and your other updates on your dashboard:\n${input.dashboardLink}\n\n— GlowUpp`,
    html: emailWrapper(
      `<p>Hi ${escapeHtml(input.contactName)},</p><p>${escapeHtml(message)}</p><p><a href="${escapeHtml(input.dashboardLink)}">See your dashboard</a></p>`
    ),
  });
}
