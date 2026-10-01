import { and, asc, eq, sql } from '@repo/db';
import { space, spaceInvitation, spaceMember, user } from '@repo/db/schema';
import { nanoid } from 'nanoid';
import type { createInvitationSchema, revokeInvitationSchema } from './invitations-schemas';
import type { DatabaseInstance } from '@repo/db/client';
import type { z } from 'zod';
import { INVITATION_CREATED } from '../../events/domain-events';
import { recordEvent } from '../../events/outbox';
import {
  AlreadyMemberError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from '../../shared/errors';
import { assertMay, type SpaceMembership } from '../spaces';
import { deriveInvitationToken, hashInvitationToken } from './invitation-token';

type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
type RevokeInvitationInput = z.infer<typeof revokeInvitationSchema>;

export const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const isExpired = (invitation: { expiresAt: Date }) => invitation.expiresAt.getTime() <= Date.now();

// The invitation and its `invitation.created` event commit together, so the email is sent if
// and only if the invitation exists. Re-inviting an address replaces its pending invitation
// under a new id — hence a new token — so the earlier link stops working.
export async function createInvitation(
  db: DatabaseInstance,
  secret: string,
  inviterId: string,
  membership: SpaceMembership,
  input: CreateInvitationInput,
) {
  assertMay(membership, 'manageMembership');

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ userId: spaceMember.userId })
      .from(spaceMember)
      .innerJoin(user, eq(spaceMember.userId, user.id))
      .where(
        and(eq(spaceMember.spaceId, membership.spaceId), sql`lower(${user.email}) = ${input.email}`),
      )
      .limit(1);
    if (existing) throw new AlreadyMemberError();

    const now = new Date();
    const id = nanoid();
    const fields = {
      id,
      role: input.role,
      tokenHash: hashInvitationToken(deriveInvitationToken(secret, id)),
      expiresAt: new Date(now.getTime() + INVITATION_LIFETIME_MS),
      invitedById: inviterId,
      createdAt: now,
    };

    // An upsert rather than delete-then-insert: two concurrent invitations of one address cannot
    // both insert, and neither fails on the unique constraint.
    const [invitation] = await tx
      .insert(spaceInvitation)
      .values({ ...fields, spaceId: membership.spaceId, email: input.email })
      .onConflictDoUpdate({
        target: [spaceInvitation.spaceId, spaceInvitation.email],
        set: fields,
      })
      .returning({
        id: spaceInvitation.id,
        email: spaceInvitation.email,
        role: spaceInvitation.role,
        expiresAt: spaceInvitation.expiresAt,
        createdAt: spaceInvitation.createdAt,
      });

    if (!invitation) throw new Error('Unable to save invitation');

    await recordEvent(tx, { eventType: INVITATION_CREATED, payload: { invitationId: id } });

    return invitation;
  });
}

// Expired invitations are listed too, flagged, so an admin sees who never answered and can
// invite them again.
export async function listInvitations(db: DatabaseInstance, membership: SpaceMembership) {
  assertMay(membership, 'manageMembership');

  const rows = await db
    .select({
      id: spaceInvitation.id,
      email: spaceInvitation.email,
      role: spaceInvitation.role,
      expiresAt: spaceInvitation.expiresAt,
      createdAt: spaceInvitation.createdAt,
    })
    .from(spaceInvitation)
    .where(eq(spaceInvitation.spaceId, membership.spaceId))
    .orderBy(asc(spaceInvitation.email));

  return rows.map((row) => ({ ...row, expired: isExpired(row) }));
}

export async function revokeInvitation(
  db: DatabaseInstance,
  membership: SpaceMembership,
  { invitationId }: RevokeInvitationInput,
) {
  assertMay(membership, 'manageMembership');

  // Scoped to the space the membership was resolved for: an admin of one space cannot reach
  // another's invitations by id.
  const deleted = await db
    .delete(spaceInvitation)
    .where(
      and(eq(spaceInvitation.id, invitationId), eq(spaceInvitation.spaceId, membership.spaceId)),
    )
    .returning({ id: spaceInvitation.id });

  if (deleted.length === 0) throw new InvitationNotFoundError();
}

// What the invitation page shows before the invitee signs in. Public: holding the link is
// the credential, and it reveals only what the email already said.
export async function previewInvitation(db: DatabaseInstance, token: string) {
  const [row] = await db
    .select({
      spaceTitle: space.title,
      role: spaceInvitation.role,
      inviterName: user.name,
      expiresAt: spaceInvitation.expiresAt,
    })
    .from(spaceInvitation)
    .innerJoin(space, eq(spaceInvitation.spaceId, space.id))
    .innerJoin(user, eq(spaceInvitation.invitedById, user.id))
    .where(eq(spaceInvitation.tokenHash, hashInvitationToken(token)))
    .limit(1);

  if (!row) throw new InvitationNotFoundError();
  if (isExpired(row)) throw new InvitationExpiredError();

  return { spaceTitle: row.spaceTitle, role: row.role, inviterName: row.inviterName };
}

// The token is the credential: the accepting user's email is deliberately not compared with
// the invited address. Auth runs without email verification, so such a check would let anyone
// claim a colleague's invitation by signing up with their address — while adding nothing for
// the holder of a link, who already proved they received the email.
//
// The invitation row is locked, so two concurrent accepts of one link cannot both succeed.
export async function acceptInvitation(db: DatabaseInstance, userId: string, token: string) {
  return db.transaction(async (tx) => {
    const [invitation] = await tx
      .select({
        id: spaceInvitation.id,
        spaceId: spaceInvitation.spaceId,
        role: spaceInvitation.role,
        expiresAt: spaceInvitation.expiresAt,
      })
      .from(spaceInvitation)
      .where(eq(spaceInvitation.tokenHash, hashInvitationToken(token)))
      .for('update')
      .limit(1);

    if (!invitation) throw new InvitationNotFoundError();
    if (isExpired(invitation)) throw new InvitationExpiredError();

    // A member following a link meant for someone else is refused, and the invitation stays
    // live: spending it would take the invitee's way in, and accepting it would change the
    // member's role.
    const joined = await tx
      .insert(spaceMember)
      .values({ spaceId: invitation.spaceId, userId, role: invitation.role, joinedAt: new Date() })
      .onConflictDoNothing()
      .returning({ userId: spaceMember.userId });
    if (joined.length === 0) throw new AlreadyMemberError('You are already a member of this space');

    await tx.delete(spaceInvitation).where(eq(spaceInvitation.id, invitation.id));

    return { spaceId: invitation.spaceId };
  });
}
