import { Resend } from 'resend';
import type { EmailMessage, EmailSender } from './email-sender';

// Production EmailSender adapter over Resend. This is the only file that knows Resend
// exists; the handler depends solely on the EmailSender port. Not exercised by the test
// suite (tests inject FakeEmailSender) — its job is to translate the port to Resend's API.
export interface ResendConfig {
  apiKey: string;
  // Verified sender. Resend's onboarding domain (`onboarding@resend.dev`) is fine for the demo.
  from: string;
}

export function createResendEmailSender({ apiKey, from }: ResendConfig): EmailSender {
  const resend = new Resend(apiKey);

  return {
    async send(message: EmailMessage): Promise<void> {
      // Resend reports failures by return value, not by throwing. The outbox relies on a
      // thrown error to leave the row `pending` and retry, so we translate `error` into one.
      const { error } = await resend.emails.send(
        {
          from,
          to: message.to,
          subject: message.subject,
          html: message.html,
        },
        { idempotencyKey: message.idempotencyKey },
      );

      if (error) {
        throw new Error(`Resend send failed: ${error.name}: ${error.message}`);
      }
    },
  };
}
