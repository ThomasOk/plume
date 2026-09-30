import { and, asc, eq } from '@repo/db';
import { space, spaceMember, type SpaceMember } from '@repo/db/schema';
import { nanoid } from 'nanoid';
import type { createSpaceSchema } from './spaces-schemas';
import type { DatabaseInstance } from '@repo/db/client';
import type { z } from 'zod';
import { SpaceNotFoundError } from '../../shared/errors';

type CreateSpaceInput = z.infer<typeof createSpaceSchema>;

/**
 * The facts about a reader and a space, resolved once per request by `spaceProcedure`.
 * Holding one is the proof that the reader is a member.
 */
export type SpaceMembership = Pick<SpaceMember, 'spaceId' | 'role'>;

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

  return { ...row, role: membership.role };
}
