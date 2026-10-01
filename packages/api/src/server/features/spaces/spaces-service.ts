import { and, asc, count, eq, sql } from '@repo/db';
import { space, spaceMember, type SpaceMember } from '@repo/db/schema';
import { nanoid } from 'nanoid';
import type { createSpaceSchema, renameSpaceSchema } from './spaces-schemas';
import type { DatabaseInstance } from '@repo/db/client';
import type { z } from 'zod';
import { InsufficientPermissionsError, SpaceNotFoundError } from '../../shared/errors';
import { may, type SpaceAction } from './space-policy';

type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
type RenameSpaceInput = z.infer<typeof renameSpaceSchema>;

/**
 * The facts about a reader and a space, resolved once per request by `spaceProcedure`.
 * Holding one is the proof that the reader is a member.
 */
export type SpaceMembership = Pick<SpaceMember, 'spaceId' | 'role'>;

// Refuses an action the member's role does not allow. The membership itself was resolved by
// `spaceProcedure`; this asks the role matrix about it.
export function assertMay(membership: SpaceMembership, action: SpaceAction) {
  if (!may(membership.role, action)) throw new InsufficientPermissionsError();
}

export async function findMembership(
  db: DatabaseInstance,
  userId: string,
  spaceId: string,
): Promise<SpaceMembership | undefined> {
  const [row] = await db
    .select({ spaceId: spaceMember.spaceId, role: spaceMember.role })
    .from(spaceMember)
    .where(and(eq(spaceMember.spaceId, spaceId), eq(spaceMember.userId, userId)))
    .limit(1);
  return row;
}

// The space and its first admin commit together: a space is never created without an
// admin.
export async function createSpace(db: DatabaseInstance, userId: string, input: CreateSpaceInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(space)
      .values({ id: nanoid(), title: input.title, createdAt: now, updatedAt: now })
      .returning();

    if (!created) throw new Error('Unable to save space');

    await tx
      .insert(spaceMember)
      .values({ spaceId: created.id, userId, role: 'admin', joinedAt: now });

    return { id: created.id, title: created.title, role: 'admin' as const };
  });
}

export async function listSpaces(db: DatabaseInstance, userId: string) {
  return db
    .select({ id: space.id, title: space.title, role: spaceMember.role })
    .from(spaceMember)
    .innerJoin(space, eq(spaceMember.spaceId, space.id))
    .where(eq(spaceMember.userId, userId))
    .orderBy(asc(space.title));
}

export async function getSpace(db: DatabaseInstance, membership: SpaceMembership) {
  const [row] = await db
    .select({ id: space.id, title: space.title })
    .from(space)
    .where(eq(space.id, membership.spaceId))
    .limit(1);

  // Unreachable while membership cascades on space deletion, kept so that a race with a
  // deletion answers like any other missing space.
  if (!row) throw new SpaceNotFoundError();

  // The headcount lets the interface tell the last admin, before they try, that leaving needs
  // another admin first — or, alone in the space, that deleting it is the way out. The server
  // still guards leaving itself (`keepsAnAdmin`); this only spares a refusal.
  const [headcount] = await db
    .select({
      memberCount: count(),
      adminCount: count(sql`case when ${spaceMember.role} = 'admin' then 1 end`),
    })
    .from(spaceMember)
    .where(eq(spaceMember.spaceId, membership.spaceId));

  return {
    ...row,
    role: membership.role,
    memberCount: headcount?.memberCount ?? 0,
    adminCount: headcount?.adminCount ?? 0,
  };
}

export async function renameSpace(
  db: DatabaseInstance,
  membership: SpaceMembership,
  input: RenameSpaceInput,
) {
  assertMay(membership, 'manageSpace');

  const [renamed] = await db
    .update(space)
    .set({ title: input.title, updatedAt: new Date() })
    .where(eq(space.id, membership.spaceId))
    .returning({ id: space.id, title: space.title });

  // A race with a deletion answers like any other missing space.
  if (!renamed) throw new SpaceNotFoundError();

  return renamed;
}

// The database cascades the rest: memberships, invitations, memos, and the comments under
// them. The space owns its contents, so they go with it.
export async function deleteSpace(db: DatabaseInstance, membership: SpaceMembership) {
  assertMay(membership, 'manageSpace');

  await db.delete(space).where(eq(space.id, membership.spaceId));
}
