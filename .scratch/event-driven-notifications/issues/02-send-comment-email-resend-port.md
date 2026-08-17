# 02 — `sendCommentEmail` sends an email via the Resend port

**What to build:** A second, independent reaction to `comment.created`: the parent Memo's
Author receives an email when another User comments on their Memo. This is added as a new
subscriber plus one `.on(...)`, with the Comment producer (`createMemo`) untouched —
demonstrating that reactions are decoupled from the core action ("integrate an external
API").

- Introduce an `EmailSender` port. Production adapter (`ResendEmailSender`) calls Resend; a
  `FakeEmailSender` records sends in memory for tests.
- `sendCommentEmail` subscribes to `comment.created`, resolves the parent Memo's Author as
  recipient, and sends via the port, passing an **idempotency key = the outbox row id** so a
  replay does not send a second email.
- The handler depends only on the port, never on Resend directly.
- Resend API key via environment; verified sender domain is a config task (Resend onboarding
  domain is acceptable for the demo).

**Blocked by:** 01 — needs the `comment.created` event, the `EventBus`, and `drainOnce`.

**Status:** ready-for-human

- [x] After `drainOnce` processes a `comment.created` row, exactly one email is recorded by
      the `FakeEmailSender`, addressed to the parent Memo's Author.
- [x] Calling `drainOnce` again results in still one email (idempotency key = outbox id).
- [x] Adding this handler required no change to `createMemo` (verified by the producer tests
      from ticket 01 still passing unchanged).
- [x] Tests inject `FakeEmailSender` (mirroring the `mockStorage`/`mockLogger` style) and
      never hit the network.
