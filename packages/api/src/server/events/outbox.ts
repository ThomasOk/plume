import { and, asc, eq, lte, outbox } from '@repo/db';
import { nanoid } from 'nanoid';
import type { DomainEventMap, DomainEventType } from './domain-events';
import type { EventBus } from './event-bus';
import type { DatabaseInstance } from '@repo/db/client';

// The transaction handle drizzle passes to `db.transaction(async (tx) => ...)`. Deriving
// it here lets `recordEvent` accept either the root db or a transaction, so the producer
// can write the outbox row inside the same transaction as the fact it describes.
type Transaction = Parameters<Parameters<DatabaseInstance['transaction']>[0]>[0];
export type DbOrTransaction = DatabaseInstance | Transaction;

// Records a domain event into the outbox. Called inside the producer's transaction so the
// event and the fact commit together (both or neither). Payload is typed against the event
// map so producers cannot record a malformed event.
export async function recordEvent<K extends DomainEventType>(
  db: DbOrTransaction,
  event: { eventType: K; payload: DomainEventMap[K] },
): Promise<void> {
  const now = new Date();
  await db.insert(outbox).values({
    id: nanoid(),
    eventType: event.eventType,
    payload: event.payload,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
  });
}

export interface DrainDeps {
  db: DatabaseInstance;
  bus: EventBus;
}

// A row is dead-lettered (status='failed', no longer retried) once it has failed this many
// times, so one poison event cannot block the pipeline forever.
export const MAX_ATTEMPTS = 5;

// Base unit of the exponential backoff. The nth failure schedules the next attempt
// BASE_RETRY_DELAY_MS * 2^(n-1) into the future: 1s, 2s, 4s, 8s; the 5th failure
// dead-letters instead of scheduling a retry.
const BASE_RETRY_DELAY_MS = 1000;

// Processes one batch of due outbox rows. Reads `pending` rows whose `nextAttemptAt` has
// passed, in FIFO order, dispatches each through the bus, and marks it `processed` once every
// handler resolved. A row whose handler throws is not marked processed: its `attempts` is
// incremented, the error recorded, and `nextAttemptAt` pushed out by exponential backoff so a
// later drain retries it without hammering the failing dependency — at-least-once delivery.
// After MAX_ATTEMPTS failures the row is dead-lettered (status='failed') so a poison event
// never blocks the FIFO queue. Callable directly, so tests trigger processing deterministically
// instead of waiting on the interval worker.
export async function drainOnce({ db, bus }: DrainDeps): Promise<void> {
  const now = new Date();
  const rows = await db
    .select()
    .from(outbox)
    .where(and(eq(outbox.status, 'pending'), lte(outbox.nextAttemptAt, now)))
    .orderBy(asc(outbox.createdAt), asc(outbox.id));

  for (const row of rows) {
    try {
      // The row id is the event's delivery identity; handlers use it as an idempotency key.
      await bus.emit(row.eventType, row.payload, { eventId: row.id });
    } catch (error) {
      await recordFailure(db, row, error, now);
      continue;
    }
    await db
      .update(outbox)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(outbox.id, row.id));
  }
}

// Applies the retry/dead-letter bookkeeping for one failed delivery. The row stays `pending`
// with a backed-off `nextAttemptAt` until it hits MAX_ATTEMPTS, at which point it is set aside
// as `failed`.
async function recordFailure(
  db: DatabaseInstance,
  row: { id: string; attempts: number },
  error: unknown,
  now: Date,
): Promise<void> {
  const attempts = row.attempts + 1;
  const deadLettered = attempts >= MAX_ATTEMPTS;
  const backoffMs = BASE_RETRY_DELAY_MS * 2 ** (attempts - 1);
  await db
    .update(outbox)
    .set({
      attempts,
      lastError: error instanceof Error ? error.message : String(error),
      status: deadLettered ? 'failed' : 'pending',
      nextAttemptAt: new Date(now.getTime() + backoffMs),
    })
    .where(eq(outbox.id, row.id));
}
