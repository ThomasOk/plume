# 03 — Exponential backoff and dead-letter for failing events

**What to build:** The outbox drain survives a failing handler without losing the event or
hammering the failing dependency. On any handler failure for a row, delivery is retried with
growing delays, and an event that keeps failing is set aside after a bounded number of
attempts so it never blocks the pipeline. This makes the at-least-once delivery robust.

- On a handler failure during `drainOnce`: do not mark the row `processed`; increment
  `attempts`, record `lastError`, and set `nextAttemptAt` using exponential backoff. The
  drain only picks up `pending` rows whose `nextAttemptAt` has passed.
- After **N = 5** attempts, set `status = 'failed'` (dead-letter) and stop retrying it.
- Uses the outbox columns already created in ticket 01 (no new migration).

**Blocked by:** 01 — the retry logic lives in `drainOnce` and uses the outbox columns from
ticket 01. Testable with any subscriber that throws; the realistic failure source is the
email handler (ticket 02), but this ticket does not depend on it and can proceed in parallel
with 02.

**Status:** ready-for-agent

- [ ] When a subscribed handler throws, the row stays `pending`, `attempts` is incremented,
      `lastError` is recorded, and `nextAttemptAt` is pushed further out on each failure.
- [ ] A row is not retried before its `nextAttemptAt` has passed.
- [ ] After 5 failed attempts the row becomes `status = 'failed'` and is no longer retried.
- [ ] Recovery: a handler that throws once then succeeds results in exactly one Notification
      and (with ticket 02 present) one email — no duplicates — once drained again.
- [ ] Tests use a controllable failing handler and real Postgres; the interval worker is
      never started.
