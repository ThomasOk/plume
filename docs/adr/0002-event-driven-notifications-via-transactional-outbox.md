# Event-driven notifications via a transactional outbox

Creating a comment used to call the notification directly inside `createMemo`. We
inverted this into an event-driven pipeline: `createMemo` now records a `comment.created`
domain event and knows nothing about its consequences. Subscribers react
independently — `persistNotification` writes the notification row, `sendCommentEmail`
calls an external email API (Resend) — so adding a reaction is a new subscriber, not an
edit to the comment logic.

Durability comes from a **transactional outbox**, not from emitting in memory. `createMemo`
writes the event into an `outbox` table **inside the same transaction as the comment**, then
returns. A single in-process polling worker drains the table (~1s) and dispatches each row
through an `EventBus` port (an `EventEmitter` today) to the subscribers, only after commit.
This guarantees we never react to a comment whose transaction rolled back — the failure a
plain in-memory `emit` cannot prevent, because the emitter lives in RAM and the row lives on
disk. Delivery is therefore **at-least-once**, made safe by **idempotent handlers**: the
notification is deduplicated by a unique constraint on `notification.entity_id`
(`ON CONFLICT DO NOTHING`), the email by an idempotency key (the outbox row id). Failed rows
retry with exponential backoff and dead-letter to `status = 'failed'` after N attempts.
External systems sit behind ports (`EventBus`, `EmailSender`), so tests inject in-memory
fakes and never touch the network.

## Considered options

- **In-memory `EventEmitter` alone** (no outbox) — rejected: an event emitted then a
  rolled-back transaction means emailing about a comment that does not exist, unrecoverably.
- **A message broker (Redis / RabbitMQ / Kafka)** — rejected *for now*: a broker solves
  cross-process distribution and durability. Plume is single-instance with trivial volume,
  so it has the durability problem (solved by the outbox, zero new infra) but **not** the
  distribution problem. The `EventBus` port marks where a broker would plug in.

## Consequences (the deliberate no's and their triggers)

The scope is intentionally one flow and no more; each excluded piece has a concrete trigger
that would justify it later, and none of those triggers exists yet:

- **No broker** — trigger: a *second server instance* (an in-process emitter cannot reach
  subscribers in another process's memory).
- **No `SELECT ... FOR UPDATE SKIP LOCKED`** — trigger: a *second worker* competing for the
  same `pending` rows.
- **No `LISTEN/NOTIFY`** — trigger: a need for sub-second latency; polling's ~0.5s is
  invisible for a notification, and `NOTIFY` is a missable signal that would still need
  polling underneath as a safety net.

Notifications become **eventually consistent** (they appear a poll-cycle after the comment
rather than synchronously). This is invisible in practice: the frontend already polls the
notification list every 30s, and the receiver is never the comment's author.
