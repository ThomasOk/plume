# 01 — Comment records `comment.created` in the outbox, drained to the Notification

**What to build:** When a User creates a Comment on another User's Memo, the Comment
creation records a `comment.created` domain event into a transactional outbox instead of
creating the Notification inline, and a drain step turns that event into the Notification.
This replaces today's inline coupling end-to-end: the Comment logic announces a fact and
knows nothing about Notifications. Notifications become eventually consistent (written when
the outbox is drained, not synchronously).

This is the foundational slice. It introduces the `outbox` table (complete schema), the
`EventBus` port (in-process `EventEmitter` implementation), the `drainOnce` step, and the
`persistNotification` handler — and refactors the Comment producer onto them.

Producer changes:
- Comment creation becomes transactional: the Comment insert and the outbox insert commit
  together (both or neither).
- It records `comment.created` with a **thin** payload of facts only:
  `{ commentId, parentMemoId, authorId }`. The receiver is NOT in the payload.
- It emits **unconditionally** — including for a Comment on one's own Memo.
- The self-notification check (`author is the parent Memo's Author`) is **removed from the
  producer**.

Consumer changes:
- `persistNotification` subscribes to `comment.created`, derives the receiver by looking up
  the parent Memo's Author, applies the policy (skip when the Comment's Author is the parent
  Memo's Author), and writes the Notification (`type: MEMO_COMMENT`, sender = author,
  `entityId` = comment id).
- `drainOnce` reads `pending` outbox rows in FIFO order, dispatches each through the
  `EventBus`, and marks the row `processed` on success.

Schema (two Drizzle migrations, per CLAUDE.md flow):
1. New generic `outbox` table with the **complete** column set: `id` (text/nanoid),
   `eventType` (text), `payload` (jsonb), `status` (enum `pending`/`processed`/`failed`,
   default `pending`), `attempts` (int, default 0), `nextAttemptAt` (timestamp),
   `lastError` (text, nullable), `createdAt`, `processedAt` (nullable). The
   `attempts`/`nextAttemptAt`/`lastError`/`failed` fields exist now but are only exercised
   by ticket 03.
2. Unique constraint on `notification.entityId`, so `persistNotification` is idempotent via
   insert-on-conflict-do-nothing.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [x] Creating a Comment on another User's Memo writes exactly one `pending` outbox row and
      one Comment row in the same transaction (both present, or both absent on failure).
- [x] Immediately after Comment creation, no Notification exists yet (the producer triggers
      nothing directly).
- [x] `drainOnce` turns a `pending` `comment.created` row into the correct Notification
      (right sender, receiver = parent Memo's Author, `entityId` = comment id) and marks the
      row `processed`.
- [x] Calling `drainOnce` again does not create a duplicate Notification (unique constraint
      on `notification.entityId` + insert-on-conflict).
- [x] A Comment on one's own Memo produces no Notification after drain (policy lives in the
      handler; the event was still emitted).
- [x] The `notification.entityId` unique-constraint migration accounts for any pre-existing
      duplicate rows (dedup if present) so it applies cleanly.
- [x] Tests follow the prior art in `memos.integration.test.ts` (real Postgres via
      testcontainers) and never start the interval worker.
