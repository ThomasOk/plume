import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  varchar,
  text,
  timestamp,
  index,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { user } from './auth';
import { space } from './spaces';

export const visibilityEnum = pgEnum('visibility', [
  'public',
  'private',
  'space',
]);

export const memo = pgTable(
  'memo',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Self-referential FK: null = root memo, non-null = comment on a parent memo.
    // ON DELETE CASCADE ensures comments are deleted when the parent is deleted.
    parentId: text('parent_id').references((): AnyPgColumn => memo.id, {
      onDelete: 'cascade',
    }),
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
    // Null = personal memo, non-null = memo in a space. Visibility and placement are one
    // decision, not two: see the CHECK constraint below and ADR 0003. ON DELETE CASCADE
    // because a space owns its memos — deleting the space deletes them.
    spaceId: text('space_id').references(() => space.id, {
      onDelete: 'cascade',
    }),
    // Null = not pinned. When it was pinned, not merely whether, so the latest pin comes
    // first among the pinned (ADR 0006). Set and cleared only by pinning, unpinning and
    // moving: never by an edit.
    pinnedAt: timestamp('pinned_at'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    // The dominant read inside a space: its memos, newest first.
    index('memo_space_id_created_at_idx').on(
      table.spaceId,
      table.createdAt.desc(),
    ),
    // The equivalence `visibility = 'space' <=> space_id IS NOT NULL`, in both
    // directions, which is what makes `space + private` and `space + public`
    // unrepresentable (ADR 0003). The implication alone would not.
    //
    // `visibility::text` rather than the enum literal on purpose: Postgres refuses to use
    // a newly added enum value in the transaction that added it, and drizzle's migrator
    // runs every pending migration in one transaction — so naming 'space' here would make
    // the migration that introduces the value fail to apply.
    check(
      'memo_space_visibility_equivalence',
      sql`(${table.spaceId} IS NOT NULL) = (${table.visibility}::text = 'space')`,
    ),
  ],
);

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
  // A pin is its own operation, decided by whoever governs the memo's scope (ADR 0006).
  pinnedAt: true,
  createdAt: true,
  updatedAt: true,
  // A client never names a space in a memo's fields: placing a memo in one requires
  // knowing the writer is a member of it, so the space comes from the space procedure
  // that resolved the membership, never from the payload.
  spaceId: true,
});

export const selectMemoSchema = createSelectSchema(memo);

export type Memo = typeof memo.$inferSelect;
export type InsertMemo = z.infer<typeof insertMemoSchema>;
