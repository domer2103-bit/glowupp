import "server-only";
import type { NotificationProvider } from "./types";
import { ResendNotificationProvider } from "./resend";

export type { NotificationProvider, SendEmailInput, SendEmailResult } from "./types";

/** The single place that decides which provider is live, same pattern as `getImageProvider`. */
export function getNotificationProvider(): NotificationProvider {
  return new ResendNotificationProvider();
}
