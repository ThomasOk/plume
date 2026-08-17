import { asc, eq, outbox } from '@repo/db';
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

// Processes one batch of pending outbox rows. Reads `pending` rows in FIFO order, dispatches
// each through the bus, and marks it `processed` only once every handler resolved. A row whose
// handler throws is simply left `pending` (never marked processed), so a later drain retries it
// — at-least-once delivery. Retry backoff and dead-lettering a poison row (which would otherwise
// block the FIFO queue) are deliberately deferred to a later ticket. Callable directly, so tests
// trigger processing deterministically instead of waiting on the interval worker.
export async function drainOnce({ db, bus }: DrainDeps): Promise<void> {
  const rows = await db
    .select()
    .from(outbox)
    .where(eq(outbox.status, 'pending'))
    .orderBy(asc(outbox.createdAt), asc(outbox.id));

  for (const row of rows) {
    // The row id is the event's delivery identity; handlers use it as an idempotency key.
    await bus.emit(row.eventType, row.payload, { eventId: row.id });
    await db
      .update(outbox)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(outbox.id, row.id));
  }
}
