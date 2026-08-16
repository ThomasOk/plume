# Handoff — Event-driven notification pipeline

> Working doc to let a fresh session pick up this feature. Not project reference
> documentation. Read this, then read the referenced code, then start the workflow
> in **Suggested skills**.

## Why this feature exists

This is driven by a job interview (Greenkub — full-stack TS/React/Node/Python,
internal tooling). The offer's only distinctive architecture keyword is
**event-driven architecture**, plus **integrating/making APIs communicate**. Plume
is today 100% synchronous (everything goes through tRPC request/response). This
feature turns one existing flow into an event-driven pipeline — a realistic,
non-gadget change that gives concrete interview talking points.

Goal is **pedagogical + portfolio**, not shipping scale. Simplicity and defensible
judgment matter more than infra sophistication.

## Current state (the coupling to remove)

Notifications and comments are **already implemented and working**. The problem is
tight coupling, located precisely here:

- `packages/api/src/server/features/memos/memos-service.ts:170` — inside
  `createMemo()`, when the new memo is a comment, it directly calls
  `createCommentNotification(...)`. The comment-creation logic *knows* it must
  create a notification and triggers it imperatively.
- `packages/api/src/server/shared/notifications.ts` — `createCommentNotification()`
  does a single `db.insert(notification)`.

Every new reaction (email, mentions, realtime) would today mean editing the comment
business logic. That's what event-driven fixes.

## Decision (agreed scope — DO build)

Turn the notification into an **event-driven pipeline**:

1. **In-process event bus** using Node's `EventEmitter`, isolated behind a small
   interface so it's swappable later. `createMemo` stops calling the notification
   directly and instead **emits** a domain event `comment.created`
   (past tense = a fact, not a command) carrying `{ commentId, memoId, authorId, receiverId }`.
2. **Handler `persistNotification`** — subscribes to `comment.created`, does what
   `createCommentNotification` does today (writes the notification row). This is the
   pure refactor: same behavior, decoupled.
3. **Handler `sendCommentEmail`** — subscribes to the same event, calls an **external
   email API** (Resend or Postmark). This is the "integrate/make APIs communicate"
   point from the offer.
4. **Transactional outbox (Postgres)** for durability: write the event into an
   `outbox` table **inside the same transaction** as the comment, then a worker
   drains it and runs handlers. Guarantees we never email about a comment whose
   transaction rolled back. This is the strongest technical talking point.

## Decision (explicitly OUT of scope — do NOT build)

- **No Redis / RabbitMQ / Kafka.** Deliberate. Plume is single-instance, trivial
  volume; a broker solves multi-process distribution + durability we don't have a
  problem for. Adding it would be resume-driven over-engineering — and this specific
  offer explicitly screens for "pertinent, not just programmatic" solutions. The
  outbox table gives the same durability guarantee with zero new infra.
  - Interview line to keep: *"In-process EventEmitter because volume didn't justify a
    broker; isolated behind an interface so swapping to Redis/RabbitMQ when there are
    multiple instances is a localized change, not a rewrite of business logic."*
- **No NoSQL.** Was considered (outbox/event log as a NoSQL candidate) and dropped —
  ticking a box artificially. Keep as an "here's how I'd extend it" verbal note only.
- **No realtime/SSE** for now — nice visually but drifts from the event-driven core.
  Optional later stretch.

## Interview talking points this produces

- Command → fact inversion (producer announces, doesn't command consequences).
- Coupling removal: adding a reaction = new file + one `.on(...)`, business logic untouched.
- The consistency subtlety: event emitted then transaction rolls back → outbox pattern.
- Judgment on infra: knowing *when* Redis/a broker becomes necessary vs adding it reflexively.

## Repo conventions to respect (from CLAUDE.md)

- Routes live ONLY in `apps/web/src/routes/` — features expose components/hooks/schemas.
- Schema changes: edit `packages/db/src/schemas/` → `pnpm db:generate` → commit the
  generated migration → `pnpm db:migrate`. The `outbox` table is a schema change → follow this.
- Feature-based structure on both frontend and backend.
- Mentorship mode: propose a plan and wait for go-ahead before non-trivial implementation.
  Explain the *why* and trade-offs.

## References (read these, don't duplicate them)

- `README.md` — stack, architecture, commands.
- `CONTEXT.md` — domain glossary (Memo, Comment, Notification, etc.). "Notification"
  is already defined there.
- `packages/db/src/schemas/notifications.ts` — existing notification schema.
- `packages/api/src/server/features/notifications/` — existing notifications feature.
- `packages/api/src/server/features/memos/memos-service.ts` — `createMemo`, the coupling site.
- `packages/api/src/server/shared/notifications.ts` — current inline notification creation.

## Suggested skills / next steps

1. `/to-spec` — turn this into the durable feature spec at
   `.scratch/event-driven-notifications/spec.md` (the reference the implementation follows).
2. `/tdd` — build the bus + handlers test-first (there's already a real-Postgres
   integration test setup with Vitest).
3. `/implement` — execute against the spec.

Start by reading the coupling site (`memos-service.ts:170` + `shared/notifications.ts`)
so the refactor target is concrete before touching anything.
