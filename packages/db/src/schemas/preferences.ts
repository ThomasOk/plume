import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

// One row per user, holding their preferences as typed columns rather than key/value pairs,
// so the database owns each preference's type and default. A missing row means every
// preference has its default: no row is written at sign-up, and none needs backfilling.
export const userPreference = pgTable('user_preference', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  commentEmails: boolean('comment_emails').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type UserPreference = typeof userPreference.$inferSelect;
