import "server-only";
import { Resend } from "resend";
import type { NotificationProvider, SendEmailInput, SendEmailResult } from "./types";

const FROM_ADDRESS = "GlowUpp <hello@glowupp.co.uk>";

export class ResendNotificationProvider implements NotificationProvider {
  readonly providerId = "resend";

  private get client(): Resend {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set.");
    return new Resend(key);
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const { data, error } = await this.client.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    if (error || !data?.id) {
      throw new Error(`Resend sendEmail failed: ${error?.message ?? "unknown error"}`);
    }
    return { id: data.id, provider: this.providerId };
  }
}
