# Spec — Event-driven notification pipeline

Status: ready-for-agent

> Reference spec for the feature. Decisions here are the contract the implementation
> follows. Companion documents: `handoff.md` (why this exists),
> `docs/adr/0002-event-driven-notifications-via-transactional-outbox.md` (the recorded
> decision + rejected alternatives). Domain vocabulary: `CONTEXT.md`.

## Problem Statement

Today, creating a Comment on a Memo directly triggers the Notification for the parent
Memo's Author, inline inside the comment-creation logic. The comment logic *knows* it must
create a Notification and does it imperatively. Every additional reaction to a new Comment
(email, mentions, realtime) would mean editing the comment business logic — the reactions
and the core action are tightly coupled. There is also a correctness gap: comment creation
is not transactional, and the reaction (the Notification) runs as a second, independent
statement, so a reaction could fire for a Comment whose write later fails, or fail after
the Comment is already committed.

The developer needs one existing flow turned into a defensible event-driven pipeline: a
realistic, non-gadget change that demonstrates command→fact inversion, decoupling, and a
durability guarantee — as concrete talking points for a job interview (event-driven
architecture + integrating external APIs).

## Solution

Invert the flow so the Comment creation announces a **fact** and knows nothing about its
consequences. When a Comment is created, `createMemo` records a `comment.created` domain
event into a **transactional outbox** — in the *same transaction* as the Comment — and
returns. It never calls a Notification or an email directly.

A single in-process worker drains the outbox and, only after the Comment's transaction has
committed, dispatches each event through an **EventBus** port to independent subscribers:

- `persistNotification` — writes the Notification row (the pure refactor of today's
  behavior), applying the notification policy (no Notification when the Comment's Author is
  the parent Memo's Author).
- `sendCommentEmail` — calls an external email API (Resend) to email the parent Memo's
  Author.

Adding a future reaction becomes a new subscriber plus one `.on(...)`, with the comment
business logic untouched. Notifications become **eventually consistent** (they appear a
poll cycle after the Comment rather than synchronously) — invisible in practice, since the
notification list already polls every 30 seconds and the receiver is never the Comment's
Author.

## User Stories

1. As the parent Memo's Author, I want to be notified when another User comments on my
   Memo, so that I know about the reply.
2. As the parent Memo's Author, I want to receive an email when another User comments on my
   Memo, so that I hear about it without opening the app.
3. As a User commenting on my own Memo, I do not want to notify or email myself, so that I
   am not spammed about my own activity.
4. As a User writing a Comment, I want the Comment saved immediately regardless of whether
   the email provider is slow or down, so that a secondary reaction never blocks or fails
   my action.
5. As the parent Memo's Author, I want to never receive an email about a Comment that was
   never actually saved, so that notifications reflect reality.
6. As the parent Memo's Author, I want at most one Notification and one email per Comment
   even if the system retries after a crash, so that I am not spammed by duplicates.
7. As the parent Memo's Author, I want my Notification/email to still arrive after a
   temporary email-provider outage, so that a transient failure does not silently drop it.
8. As an operator, I want events whose delivery keeps failing to be set aside after a
   bounded number of attempts, so that one poison event never blocks the pipeline.
9. As an operator, I want a failing external API to be retried with growing delays rather
   than hammered every second, so that we do not amplify an outage.
10. As a developer, I want to add a new reaction to a new Comment by writing one subscriber
    and one `.on(...)`, without touching the comment business logic, so that reactions stay
    decoupled from the core action.
11. As a developer, I want each external system (event bus, email provider) behind a port,
    so that I can swap the implementation without touching business logic.
12. As a developer, I want to run the notification/email handlers in tests against a real
    database without sending real emails or hitting the network, so that tests are
    deterministic and free.
13. As a developer, I want the worker's drain step to be a directly-callable function, so
    that tests can trigger processing deterministically instead of waiting on a timer.
14. As an operator, I want the worker to stop cleanly on shutdown (Railway `SIGTERM`) and
    let the in-flight drain finish, so that a redeploy does not corrupt in-progress work.
15. As a developer, I want the Comment and its outbox event written in one transaction, so
    that they are always both present or both absent.
16. As a developer, I want the comment-creation request path to gain no new dependency, so
    that the change stays localized to the outbox write.

## Implementation Decisions

**Producer (`createMemo`).**
- `createMemo` becomes transactional: the Comment insert and the outbox insert happen in a
  single database transaction.
- On Comment creation, `createMemo` records a `comment.created` event into the `outbox`
  table. It emits **unconditionally** — even for a Comment on one's own Memo (that is still
  a Comment created; the fact is true).
- The self-notification check currently in `createMemo` (`parent.userId !== userId`) is
  **removed from the producer** and becomes notification policy in the handler.
- `createMemo` gains **no new dependency** — it only needs `db` to write the outbox row.
  The tRPC context (`db`, `storage`, `session`, `logger`) is unchanged; `EventBus` and
  `EmailSender` are worker-only concerns.

**Event.**
- Name: `comment.created` (past tense = a fact).
- Payload is **thin — facts only**: `{ commentId, parentMemoId, authorId }`. The receiver is
  **not** in the payload; it is derived by the handler. Rationale: "who to notify" is a
  policy, not a fact, and must not live in the producer.

**Outbox (schema change → Drizzle migration).**
- New generic `outbox` table. Suggested columns: `id` (text/nanoid — also used as the email
  idempotency key), `eventType` (text), `payload` (jsonb), `status` (enum
  `pending`/`processed`/`failed`, default `pending`), `attempts` (int, default 0),
  `nextAttemptAt` (timestamp), `lastError` (text, nullable), `createdAt`, `processedAt`
  (nullable). Payload is `jsonb` and `eventType` is `text` so the table stays generic across
  future event types.

**EventBus port.**
- A small `EventBus` interface (`emit` / `on`) isolates the dispatch mechanism. The only
  implementation today wraps Node's `EventEmitter` (in-process). This marks the seam where a
  broker (Redis/RabbitMQ) would plug in *if* the app ever runs multiple instances.

**Worker.**
- In-process **polling** worker, ~1s interval. Delivery is **at-least-once**.
- Split into `drainOnce(deps)` (reads `pending` outbox rows whose `nextAttemptAt` has passed,
  dispatches each via `bus.emit`, marks `processed` on success) and `startOutboxWorker(deps)`
  (the `setInterval` calling `drainOnce`). `startOutboxWorker` is called **only** at server
  boot; it must never be started by a module import (so it never runs in tests).
- Processing order is FIFO by `createdAt` (tie-break by `id` if needed).
- On any handler failure for a row: do not mark `processed`; increment `attempts`, record
  `lastError`, and set `nextAttemptAt` using **exponential backoff**. After **N = 5**
  attempts, set `status = 'failed'` (dead-letter).
- On `SIGTERM`: `clearInterval` and let the in-flight `drainOnce` finish.
- Single worker is assumed (single instance). `SELECT ... FOR UPDATE SKIP LOCKED` is **not**
  implemented; it is the documented extension for a multi-worker future.

**Handlers (idempotent — at-least-once made safe).**
- `persistNotification`: derives the receiver by looking up the parent Memo's Author from
  `parentMemoId`; applies the policy (skip when `authorId` equals the parent's Author);
  writes the Notification (`type: MEMO_COMMENT`, `senderId: authorId`, `entityId: commentId`).
  Made idempotent via a **unique constraint on `notification.entityId`** + insert that does
  nothing on conflict.
- `sendCommentEmail`: emails the parent Memo's Author via the `EmailSender` port, passing an
  **idempotency key = the outbox row id**, so a replay does not send a second email.
- Handlers are subscribed to the bus once at composition time (server boot, and in tests);
  each handler closes over its own dependencies.

**Schema changes (both via `packages/db/src/schemas/` → `db:generate` → commit migration →
`db:migrate`, per CLAUDE.md).**
1. New `outbox` table.
2. Unique constraint on `notification.entityId`.

**EmailSender port + provider.**
- Provider: **Resend**. Isolated behind an `EmailSender` interface. Production adapter
  (`ResendEmailSender`) calls Resend; the handler depends only on the port. Resend API key
  via environment; a verified sender domain is a config task (Resend's onboarding domain is
  fine for the demo).

## Testing Decisions

Good tests here assert **external behavior through the feature's public entry points**, not
private functions or internal call order. The two seams are the tRPC caller (producer) and
`drainOnce(deps)` (consumer); both run against a **real Postgres** via testcontainers.

**Prior art:** `packages/api/tests/memos.integration.test.ts` — the pattern to follow:
real Postgres from `tests/helpers/db.ts` (`startTestDatabase`/`stopTestDatabase`), tRPC
callers from `tests/helpers/trpc.ts` (`createAuthenticatedCaller(db)`), per-test table
cleanup, and DB inspection for assertions. The `EmailSender` fake mirrors the existing
`mockStorage`/`mockLogger` injection style in `tests/helpers/trpc.ts`.

**Seam A — producer, via the existing tRPC caller.** Calling `memos.create({ parentId })`:
- writes a Comment row **and** a `pending` outbox row (same transaction);
- writes **no** Notification yet (proves the producer triggered nothing).

**Seam B — consumer, via `drainOnce(deps)` called directly** (never the interval), with a
real DB, a real `EventBus` with handlers subscribed, and a `FakeEmailSender` that records
sends in memory:
- after drain: a Notification exists and one email was recorded;
- **idempotency**: calling `drainOnce` again yields still one Notification and one email;
- **self-comment**: a Comment on one's own Memo produces no Notification after drain;
- **backoff/dead-letter**: with a `FakeEmailSender` that throws, the row stays `pending`
  with incremented `attempts` and a pushed-out `nextAttemptAt`, and reaches `status =
  'failed'` after N = 5 attempts;
- **recovery**: a sender that throws once then succeeds results in exactly one email and one
  Notification (no duplicate) once drained again.

**Optional end-to-end test:** compose both public entry points (create via caller →
`drainOnce` → assert Notification + recorded email) to exercise the whole pipeline without
touching any private function.

Tests must never start the `setInterval` worker; the interval running during a test would
steal rows mid-assertion and make the suite flaky.

## Out of Scope

Each excluded item has a concrete trigger that does not exist yet (see ADR 0002):

- **Message broker (Redis/RabbitMQ/Kafka)** — trigger: a second server instance.
- **`SELECT ... FOR UPDATE SKIP LOCKED`** — trigger: a second worker.
- **`LISTEN/NOTIFY`** — trigger: a need for sub-second latency (polling's ~0.5s is invisible
  for a Notification, and `NOTIFY` would still need polling underneath as a safety net).
- **Realtime / SSE** notifications — visually nice but drifts from the event-driven core;
  optional later stretch.
- **NoSQL** for the outbox/event log.
- **New event types beyond `comment.created`** (e.g. `memo.created`) — not event-ified
  preemptively; the trigger is the moment a fact gains its second reaction.

## Further Notes

- Interview through-line this produces: command→fact inversion; decoupling (new reaction =
  new file + one `.on`); outbox = durability without new infra; at-least-once + idempotent
  consumers (no mythical exactly-once); scale judgment (polling→NOTIFY→CDC,
  EventEmitter→broker at the *multi-instance* threshold); and **when to event-ify** (a fact's
  second reaction, secondary/external/growing consequences) vs keep synchronous (essentials
  like tag extraction and permission checks).
- Deployment context (Railway, single instance, Postgres as a same-project service) is what
  makes the in-process worker + polling the pertinent choice at ~0 added cost.
- Suggested next steps after this spec: `/tdd` to build the bus + handlers test-first, then
  `/implement` against this spec, respecting the CLAUDE.md migration flow for both schema
  changes.
