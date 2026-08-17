import { pgEnum, pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

// Generic transactional outbox. `eventType` is text and `payload` is jsonb so the
// table stays event-agnostic: any future domain event can be recorded here without
// a schema change. A row is written in the same transaction as the fact it describes
// (e.g. a comment insert), then drained by the outbox worker and dispatched to handlers.
export const outboxStatusEnum = pgEnum('outbox_status', [
  'pending',
  'processed',
  'failed',
]);

export const outbox = pgTable('outbox', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  status: outboxStatusEnum('status').notNull().default('pending'),
  // Retry bookkeeping. On a failed delivery the drain increments `attempts`, records
  // `lastError`, and pushes `nextAttemptAt` out by exponential backoff; after a bounded
  // number of attempts the row is dead-lettered (`status = 'failed'`).
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: timestamp('next_attempt_at').notNull(),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').notNull(),
  processedAt: timestamp('processed_at'),
});

export type OutboxRow = typeof outbox.$inferSelect;
