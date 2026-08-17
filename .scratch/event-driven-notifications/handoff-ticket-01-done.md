# Handoff — Event-driven notifications (ticket 01 done, 02→04 remaining)

Date: 2026-08-17
Repo: `/Users/thomas/Documents/dev/plume`
Branch: `feat/event-driven-notifications/01-comment-outbox-notification`

## What this feature is

Turning the inline comment→notification coupling into an event-driven pipeline
(transactional outbox + in-process EventBus). Full context — do NOT duplicate, read these:

- Spec (the contract): `.scratch/event-driven-notifications/spec.md`
- ADR: `docs/adr/0002-event-driven-notifications-via-transactional-outbox.md`
- Why it exists: `.scratch/event-driven-notifications/handoff.md`
- Tickets: `.scratch/event-driven-notifications/issues/0{1,2,3,4}-*.md`
- Domain vocabulary: `CONTEXT.md` (note: use "author", never "owner")
- Working rules: `CLAUDE.md` (mentorship mode; schema-change flow)

## State — ticket 01 is DONE

Ticket `.scratch/event-driven-notifications/issues/01-comment-created-outbox-to-notification.md`
is implemented, reviewed, committed, and marked `ready-for-human`. All 7 acceptance
criteria met and tested.

Commits (read the diff rather than re-reading files):
- `efb9160` feat: record comment.created in outbox, drain to notification
- `32f58fc` docs: mark ticket 01 done (ready-for-human)

What shipped (see `git show efb9160` for detail):
- `packages/db/src/schemas/outbox.ts` — generic outbox table (complete column set;
  retry fields `attempts`/`nextAttemptAt`/`lastError`/`failed` present but inert until ticket 03).
- Migrations `0006` (outbox table) + `0007` (unique constraint on `notification.entity_id`,
  with a dedup `DELETE ... USING` prepended). **Both already applied to the Supabase dev DB.**
- `packages/api/src/server/events/{domain-events,event-bus,outbox,register-handlers}.ts`
- `packages/api/src/server/features/notifications/persist-notification.ts`
- `createMemo` refactored to write comment + outbox row in one `db.transaction`; deleted
  dead `shared/notifications.ts`.
- Tests: `packages/api/tests/notifications-outbox.integration.test.ts` (6 tests, real PG).

Green as of handoff: `pnpm test` (35 API tests + web), `pnpm typecheck`, `pnpm lint`
(only pre-existing warnings in untouched files).

## Key design facts a fresh agent MUST know

- **`EventBus.emit` awaits its handlers** (pulls `emitter.listeners()` and `Promise.all`s them)
  so `drainOnce` marks a row `processed` only when every handler resolved. A raw
  `EventEmitter.emit` is fire-and-forget and would break at-least-once. Don't "simplify" it back.
- **`drainOnce` (ticket 01) has NO failure handling** — read `pending` FIFO → emit → mark
  `processed`. A failing row stays `pending`; head-of-line blocking is intentional and is
  exactly what ticket 03 (backoff + dead-letter) resolves. Ticket 03 also adds the
  `nextAttemptAt <= now` read-filter (deliberately omitted now).
- **Event payload is thin — facts only**: `{ commentId, parentMemoId, authorId }`. Receiver is
  derived in the handler (policy), never in the payload.
- **`createEventBusWithHandlers(db)`** is the composition seam: a new reaction = new handler
  file + one `.on(...)` there. This is where ticket 02's `sendCommentEmail` gets subscribed.
- Nothing is wired into the running server yet — no interval worker exists. The notification
  path is currently reachable only via `drainOnce` in tests. Boot wiring is ticket 04.

## Environment gotchas (cost real time this session)

- **Docker must be running** for the integration tests (testcontainers spins postgres:16).
  Docker Desktop was started this session. `open -a Docker` then poll `docker info`.
- **`packages/db/.env` `DB_POSTGRES_URL` points at Supabase, and that IS the dev database**
  (production is Railway — see the railway memory). So `pnpm db:migrate` is safe to run for
  dev; it was run this session. Do NOT assume it's production.
- A local `plume-db-1` Postgres container was started by mistake then stopped (not needed;
  Supabase is the dev DB). `docker compose down -v` to remove it if desired.

## Remaining work (in order)

1. **Ticket 02** — `.../issues/02-send-comment-email-resend-port.md`: `EmailSender` port +
   `ResendEmailSender`, `sendCommentEmail` handler (idempotency key = outbox row id),
   subscribe it in `register-handlers.ts`. Add a `FakeEmailSender` test double mirroring the
   `mockStorage`/`mockLogger` style in `tests/helpers/trpc.ts`. Needs a Resend API key via env.
2. **Ticket 03** — `.../issues/03-backoff-and-dead-letter.md`: exponential backoff on failure
   (`attempts++`, `nextAttemptAt`, `lastError`), `status='failed'` after N=5; add the
   `nextAttemptAt <= now` filter to `drainOnce`. Tests: FakeEmailSender that throws.
3. **Ticket 04** — `.../issues/04-worker-boot-and-graceful-shutdown.md`: `startOutboxWorker`
   (`setInterval`), boot it in `apps/server/src/index.ts` only; SIGTERM → clearInterval + let
   in-flight drain finish; export `drainOnce`/factory from `@repo/api/server` package entry.

## User working preferences (from memory + this session)

- **Mentorship mode (CLAUDE.md):** propose a plan and wait for go-ahead before non-trivial
  implementation; explain the *why* and trade-offs; keep changes minimal and focused.
- **Never mention Claude/Claude Code in commits or PRs** (portfolio project) — omit the
  Co-Authored-By / Claude-Session trailers.
- User cares deeply about test *honesty* (not tautological "green" tests) and review
  independence. Be candid: this session was test-*after*, not strict TDD. If continuing,
  prefer real TDD (red first) at the seams, and be transparent about limits of self-review.
- Schema flow: edit `packages/db/src/schemas/` → `pnpm --filter @repo/db generate` → commit
  migration (hand-edit generated SQL if a data fix like dedup is needed) → migrate.

## Suggested skills for the next session

- `/tdd` — build ticket 02's email handler + port test-first at the `drainOnce`/bus seam
  (write the FakeEmailSender-based red test first this time).
- `/implement` — execute ticket 02 (then 03, 04) against the spec.
- `/code-review` (with `since main`) — after each ticket, same two-axis review used for 01.
- `resolving-merge-conflicts` — only if the branch needs rebasing onto an updated `main`.
