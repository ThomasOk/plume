import type { EmailSender } from './email-sender';

// Fallback EmailSender for when no email provider is configured (no `RESEND_API_KEY`). It
// drops the email but reports the send through the optional `log`, so the rest of the
// pipeline still works: the comment.created event is drained, `persistNotification` writes the
// Notification, and only the email reaction is a no-op. Delivery must not throw — a throw
// would leave the outbox row `pending` and retry forever against a provider that will never
// exist.
export function createNoopEmailSender(log?: (message: string) => void): EmailSender {
  return {
    async send(message) {
      log?.(`email suppressed (no email provider configured): to=${message.to}`);
    },
  };
}
