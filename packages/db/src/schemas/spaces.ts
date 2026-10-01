import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  index,
  primaryKey,
  unique,
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

// An offer to join a space, addressed to an email that may belong to no user yet — which is
// why it is its own table and not a pending state of `space_member`: there is no user id to
// key that row on. Accepting deletes this row and inserts the membership in one transaction.
//
// The token itself is never stored, only its hash: a leak of this table must not yield live
// links. One live invitation per address per space, enforced here rather than by a check in
// the service, so a race between two invites cannot leave two links.
export const spaceInvitation = pgTable(
  'space_invitation',
  {
    id: text('id').primaryKey(),
    spaceId: text('space_id')
      .notNull()
      .references(() => space.id, { onDelete: 'cascade' }),
    // Lowercased by the input schema (`createInvitationSchema`), so the uniqueness below is case-insensitive.
    email: text('email').notNull(),
    role: spaceRoleEnum('role').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    invitedById: text('invited_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [unique('space_invitation_space_id_email_unique').on(table.spaceId, table.email)],
);

export type SpaceInvitation = typeof spaceInvitation.$inferSelect;
export type SpaceRole = (typeof spaceRoleEnum.enumValues)[number];
