import type { EmailMessage, EmailSender } from '../../src/server/email/email-sender';

// Test double for the EmailSender port, mirroring the mockStorage/mockLogger injection
// style in `trpc.ts`. It records sends in memory instead of hitting the network, so tests
// stay deterministic and free.
//
// It deliberately *models Resend's idempotency contract*: a send whose idempotencyKey was
// already accepted is deduplicated, not recorded again. This is what makes the replay test
// meaningful — the outbox delivers at-least-once, so the handler may call `send` twice with
// the same key; the guarantee that only one email goes out lives in the provider, and a
// fake that just appended every call could never exercise it. `sent` is therefore the list
// the provider would actually deliver.
//
// A factory (not a module-level const) because each test needs its own fresh recording.
export interface FakeEmailSender extends EmailSender {
  readonly sent: EmailMessage[];
}

export const createFakeEmailSender = (): FakeEmailSender => {
  const sent: EmailMessage[] = [];
  const acceptedKeys = new Set<string>();

  return {
    sent,
    async send(message) {
      if (acceptedKeys.has(message.idempotencyKey)) return;
      acceptedKeys.add(message.idempotencyKey);
      sent.push(message);
    },
  };
};
