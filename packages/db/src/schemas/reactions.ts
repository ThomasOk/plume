import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { memo } from './memos';

// A reader's emoji on a memo — or on a comment, which is a memo (ADR 0001). One per reader
// per memo: choosing another replaces it, which the unique constraint makes a fact of the
// database rather than a rule each write must remember.
export const reaction = pgTable(
  'reaction',
  {
    id: text('id').primaryKey(),
    // ON DELETE CASCADE: a deleted memo takes its reactions with it, and a deleted memo's
    // comments, cascading in turn, take theirs.
    memoId: text('memo_id')
      .notNull()
      .references(() => memo.id, { onDelete: 'cascade' }),
    // ON DELETE CASCADE: a reaction is a gesture of its reader's and goes with their account,
    // never to the Former user.
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Plain text, validated against the set the API defines, deliberately not a `pgEnum`:
    // adding an emoji to the set is then a code change, not a migration — and Postgres
    // refuses to use an enum value in the transaction that added it (see `memo`).
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    unique('reaction_user_id_memo_id_unique').on(table.userId, table.memoId),
    // The grouped read: the reactions of a page of memos.
    index('reaction_memo_id_idx').on(table.memoId),
  ],
);

export type Reaction = typeof reaction.$inferSelect;
