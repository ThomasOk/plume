import { sql } from 'drizzle-orm';
import { pgTable, pgEnum, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { user } from './auth';

export const visibilityEnum = pgEnum('visibility', ['public', 'private']);

export const memo = pgTable('memo', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // VARCHAR(8000) enforces the limit at the DB level.
  // This limits by character count (not bytes). In practice, 8000 latin characters
  // stay well under PostgreSQL's TOAST threshold. We accept the trade-off vs a
  // byte-level constraint (octet_length) for the sake of UI clarity.
  content: varchar('content', { length: 8000 }).notNull(),
  tags: text('tags')
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  visibility: visibilityEnum('visibility').notNull().default('private'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Maximum character limit for memo content
export const MAX_MEMO_CHARACTERS = 8000;

export const insertMemoSchema = createInsertSchema(memo, {
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(
      MAX_MEMO_CHARACTERS,
      `Content cannot exceed ${MAX_MEMO_CHARACTERS.toLocaleString()} characters`,
    ),
}).omit({
  id: true,
  userId: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
});

export const selectMemoSchema = createSelectSchema(memo);

export type Memo = typeof memo.$inferSelect;
export type InsertMemo = z.infer<typeof insertMemoSchema>;
