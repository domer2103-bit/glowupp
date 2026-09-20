/**
 * Provider-independent notification abstraction (Phase 9 of the brief),
 * same reasoning as `src/lib/image-providers/`: nothing outside this
 * directory and `src/lib/notifications.ts` should know which provider is
 * behind it. Only email exists for now — the brief calls it "email
 * first" — but the interface name is deliberately generic so an
 * in-app/SMS provider can be added later without renaming anything.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  /** Plain-text body. Always required — the safe fallback every email client renders. */
  text: string;
  /** Optional lightweight HTML body. Kept deliberately simple (no template engine) for an MVP volume of transactional emails. */
  html?: string;
}

export interface SendEmailResult {
  id: string;
  provider: string;
}

export interface NotificationProvider {
  readonly providerId: string;
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}
