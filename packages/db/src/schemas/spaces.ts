import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { user } from './auth';

export const spaceRoleEnum = pgEnum('space_role', ['admin', 'member']);

export const space = pgTable('space', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Membership is a fact, not a workflow: a row means "this user is a member of this space".
// There is no status column — an invitation that has not been accepted is an invitation,
// not a member with a pending flag.
export const spaceMember = pgTable(
  'space_member',
  {
    spaceId: text('space_id')
      .notNull()
      .references(() => space.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: spaceRoleEnum('role').notNull(),
    joinedAt: timestamp('joined_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.spaceId, table.userId] }),
    // The composite primary key already covers "the members of one space"; this index
    // covers the other direction, "the spaces of one user", which the sidebar reads.
    index('space_member_user_id_idx').on(table.userId),
  ],
);

export const selectSpaceSchema = createSelectSchema(space);

export type Space = typeof space.$inferSelect;
export type SpaceMember = typeof spaceMember.$inferSelect;
