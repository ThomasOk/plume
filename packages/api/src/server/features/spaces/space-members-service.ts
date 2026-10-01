import { and, asc, count, eq } from '@repo/db';
import { space, spaceMember, user, type SpaceRole } from '@repo/db/schema';
import type { changeRoleSchema, memberInputSchema } from './spaces-schemas';
import type { DatabaseInstance } from '@repo/db/client';
import type { z } from 'zod';
import {
  InsufficientPermissionsError,
  LastAdminError,
  MemberNotFoundError,
  SpaceNotFoundError,
} from '../../shared/errors';
import { keepsAnAdmin, may } from './space-policy';
import { assertMay, type SpaceMembership } from './spaces-service';

type MemberInput = z.infer<typeof memberInputSchema>;
type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export async function listMembers(db: DatabaseInstance, readerId: string, membership: SpaceMembership) {
  assertMay(membership, 'manageMembership');

  const rows = await db
    .select({
      userId: spaceMember.userId,
      name: user.name,
      email: user.email,
      image: user.image,
      role: spaceMember.role,
      joinedAt: spaceMember.joinedAt,
    })
    .from(spaceMember)
    .innerJoin(user, eq(spaceMember.userId, user.id))
    .where(eq(spaceMember.spaceId, membership.spaceId))
    .orderBy(asc(spaceMember.joinedAt));

  return rows.map((row) => ({ ...row, isYou: row.userId === readerId }));
}

// What happens to one member: a new role, or out of the space.
type MemberChange = { kind: 'role'; role: SpaceRole } | { kind: 'removal' };

/**
 * Applies a change to one member of a space, on behalf of an actor, refusing whatever would
 * leave the space with no admin.
 *
 * The space row is locked first, so changes to one space's membership run one after another.
 * Without it, two admins demoting each other — or both leaving — would each count two admins
 * and both succeed, leaving none.
 *
 * For the same reason the actor's role is read again under the lock, rather than taken from
 * `spaceProcedure`: an admin demoted while their request was in flight must not still act as
 * one. Leaving — removing oneself — takes no role at all.
 */
async function changeMember(
  db: DatabaseInstance,
  spaceId: string,
  { actorId, targetId, change }: { actorId: string; targetId: string; change: MemberChange },
) {
  await db.transaction(async (tx) => {
    await tx.select({ id: space.id }).from(space).where(eq(space.id, spaceId)).for('update');

    const roleOf = async (userId: string) => {
      const [row] = await tx
        .select({ role: spaceMember.role })
        .from(spaceMember)
        .where(and(eq(spaceMember.spaceId, spaceId), eq(spaceMember.userId, userId)));
      return row?.role;
    };

    const isLeaving = change.kind === 'removal' && actorId === targetId;
    if (!isLeaving) {
      const actorRole = await roleOf(actorId);
      if (!actorRole) throw new SpaceNotFoundError();
      if (!may(actorRole, 'manageMembership')) throw new InsufficientPermissionsError();
    }

    const targetRole = await roleOf(targetId);
    if (!targetRole) throw new MemberNotFoundError();

    if (change.kind === 'removal' || change.role !== 'admin') {
      const [admins] = await tx
        .select({ count: count() })
        .from(spaceMember)
        .where(and(eq(spaceMember.spaceId, spaceId), eq(spaceMember.role, 'admin')));
      if (!keepsAnAdmin({ targetRole, adminCount: admins?.count ?? 0 })) {
        throw new LastAdminError();
      }
    }

    const isTarget = and(eq(spaceMember.spaceId, spaceId), eq(spaceMember.userId, targetId));
    if (change.kind === 'removal') await tx.delete(spaceMember).where(isTarget);
    else await tx.update(spaceMember).set({ role: change.role }).where(isTarget);
  });
}

export async function changeRole(
  db: DatabaseInstance,
  actorId: string,
  membership: SpaceMembership,
  { userId, role }: ChangeRoleInput,
) {
  await changeMember(db, membership.spaceId, {
    actorId,
    targetId: userId,
    change: { kind: 'role', role },
  });
}

export async function removeMember(
  db: DatabaseInstance,
  actorId: string,
  membership: SpaceMembership,
  { userId }: MemberInput,
) {
  await changeMember(db, membership.spaceId, {
    actorId,
    targetId: userId,
    change: { kind: 'removal' },
  });
}

// Any member may leave. Their memos stay: the space owns its contents (ADR 0003).
export async function leaveSpace(db: DatabaseInstance, userId: string, membership: SpaceMembership) {
  await changeMember(db, membership.spaceId, {
    actorId: userId,
    targetId: userId,
    change: { kind: 'removal' },
  });
}
