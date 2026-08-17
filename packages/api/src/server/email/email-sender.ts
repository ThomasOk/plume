// The EmailSender port isolates the email provider. Handlers depend on this interface,
// never on Resend directly, so the provider can be swapped (or faked in tests) without
// touching business logic. The production adapter is `ResendEmailSender`; tests use a
// `FakeEmailSender` that records sends in memory.
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  // Idempotency key for the send. The outbox delivers at-least-once, so a replay of the
  // same event must not send a second email; the provider deduplicates on this key. We
  // pass the outbox row id, which uniquely identifies the delivery across event types.
  idempotencyKey: string;
}

export interface EmailSender {
  // Must reject on failure so the outbox leaves the row `pending` and retries it. An
  // adapter over a provider that reports errors by return value (Resend) has to translate
  // that into a thrown error.
  send(message: EmailMessage): Promise<void>;
}
