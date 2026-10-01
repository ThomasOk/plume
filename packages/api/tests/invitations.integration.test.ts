import {
  type DatabaseInstance,
  eq,
  outbox,
  space,
  spaceInvitation,
  spaceMember,
  user,
} from '@repo/db';
import { TRPCError } from '@trpc/server';
import { deriveInvitationToken } from '../src/server/features/invitations/invitation-token';
import { startTestDatabase, stopTestDatabase } from './helpers/db';
import {
  TEST_INVITATION_SECRET,
  createAuthenticatedCaller,
  createTestCaller,
} from './helpers/trpc';

let db: DatabaseInstance;

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

beforeEach(async () => {
  await db.delete(outbox);
  await db.delete(space);
  await db.delete(user);
});

const userRow = (id: string, email = `${id}@example.com`) => ({
  id,
  name: id,
  email,
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const admin = userRow('admin');
const member = userRow('member');
const invitee = userRow('invitee');
// Signed up with an address that is not the invited one: holding the link is what counts.
const stranger = userRow('stranger');

// The error a caller sees, reduced to what crosses the wire.
const refusal = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => {
      throw new Error('expected the call to be refused');
    },
    (e: unknown) => e,
  );
  if (!(error instanceof TRPCError)) throw error;
  return { code: error.code, message: error.message };
};

// What the invitee finds in the email link. Tests that need the link itself, rather than the
// token it carries, read it from the sent email (`invitation-email.integration.test.ts`).
const tokenFor = (invitationId: string) =>
  deriveInvitationToken(TEST_INVITATION_SECRET, invitationId);

let spaceId: string;

beforeEach(async () => {
  await db.insert(user).values([admin, member, invitee, stranger]);
  const created = await createAuthenticatedCaller(db, admin.id).spaces.create({
    title: 'Cooking club',
  });
  spaceId = created.id;
  await db
    .insert(spaceMember)
    .values({ spaceId, userId: member.id, role: 'member', joinedAt: new Date() });
});

const asAdmin = () => createAuthenticatedCaller(db, admin.id);

const membershipOf = async (userId: string) => {
  const [row] = await db
    .select({ role: spaceMember.role })
    .from(spaceMember)
    .where(eq(spaceMember.userId, userId));
  return row;
};

describe('inviting', () => {
  it('invites an email address with the role granted on acceptance', async () => {
    const invitation = await asAdmin().invitations.create({
      spaceId,
      email: 'someone-new@example.com',
      role: 'admin',
    });

    expect(invitation).toEqual(
      expect.objectContaining({ email: 'someone-new@example.com', role: 'admin' }),
    );
    expect(invitation.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('normalizes the address, so case does not create a second invitation', async () => {
    await asAdmin().invitations.create({ spaceId, email: ' Someone@Example.com ', role: 'member' });
    await asAdmin().invitations.create({ spaceId, email: 'someone@example.com', role: 'member' });

    const pending = await asAdmin().invitations.list({ spaceId });
    expect(pending.map((i) => i.email)).toEqual(['someone@example.com']);
  });

  it('stores the token hashed: the table holds nothing that opens the link', async () => {
    const invitation = await asAdmin().invitations.create({
      spaceId,
      email: invitee.email,
      role: 'member',
    });
    const token = tokenFor(invitation.id);

    const rows = await db.select().from(spaceInvitation);
    const outboxRows = await db.select().from(outbox);
    expect(JSON.stringify(rows)).not.toContain(token);
    expect(JSON.stringify(outboxRows)).not.toContain(token);
  });

  it('records an invitation.created event in the same transaction', async () => {
    const invitation = await asAdmin().invitations.create({
      spaceId,
      email: invitee.email,
      role: 'member',
    });

    const rows = await db.select().from(outbox);
    expect(rows).toEqual([
      expect.objectContaining({
        eventType: 'invitation.created',
        payload: { invitationId: invitation.id },
      }),
    ]);
  });

  it('refuses an address that already belongs to a member, with a clear reason', async () => {
    const result = await refusal(
      asAdmin().invitations.create({ spaceId, email: 'MEMBER@example.com', role: 'member' }),
    );

    expect(result.code).toBe('CONFLICT');
    expect(result.message).toMatch(/already a member/i);
    expect(await db.select().from(spaceInvitation)).toEqual([]);
  });

  it('replaces a pending invitation when the address is invited again — never two live links', async () => {
    const first = await asAdmin().invitations.create({
      spaceId,
      email: invitee.email,
      role: 'member',
    });
    const second = await asAdmin().invitations.create({
      spaceId,
      email: invitee.email,
      role: 'admin',
    });

    expect(second.id).not.toBe(first.id);
    const pending = await asAdmin().invitations.list({ spaceId });
    expect(pending).toEqual([expect.objectContaining({ id: second.id, role: 'admin' })]);

    const caller = createAuthenticatedCaller(db, invitee.id);
    expect((await refusal(caller.invitations.accept({ token: tokenFor(first.id) }))).code).toBe(
      'NOT_FOUND',
    );
    await caller.invitations.accept({ token: tokenFor(second.id) });
    expect(await membershipOf(invitee.id)).toEqual({ role: 'admin' });
  });

  it('refuses a member who is not an admin', async () => {
    const caller = createAuthenticatedCaller(db, member.id);

    const result = await refusal(
      caller.invitations.create({ spaceId, email: invitee.email, role: 'member' }),
    );

    expect(result.code).toBe('FORBIDDEN');
  });

  it('answers a non-member as for a space that does not exist', async () => {
    const caller = createAuthenticatedCaller(db, stranger.id);

    const result = await refusal(
      caller.invitations.create({ spaceId, email: invitee.email, role: 'member' }),
    );

    expect(result).toEqual({ code: 'NOT_FOUND', message: 'Space not found' });
  });
});

describe('accepting', () => {
  let invitationId: string;

  beforeEach(async () => {
    const invitation = await asAdmin().invitations.create({
      spaceId,
      email: invitee.email,
      role: 'member',
    });
    invitationId = invitation.id;
  });

  it('makes the invitee a member with the invited role, and the invitation ceases to exist', async () => {
    const caller = createAuthenticatedCaller(db, invitee.id);

    const accepted = await caller.invitations.accept({ token: tokenFor(invitationId) });

    expect(accepted).toEqual({ spaceId });
    expect(await membershipOf(invitee.id)).toEqual({ role: 'member' });
    expect(await db.select().from(spaceInvitation)).toEqual([]);
    // The new member reads the space.
    expect(await caller.spaces.get({ spaceId })).toEqual(
      expect.objectContaining({ title: 'Cooking club' }),
    );
  });

  it('honours the link regardless of the accepting account’s email', async () => {
    const caller = createAuthenticatedCaller(db, stranger.id);

    await caller.invitations.accept({ token: tokenFor(invitationId) });

    expect(await membershipOf(stranger.id)).toEqual({ role: 'member' });
  });

  it('refuses a token that was already used', async () => {
    const token = tokenFor(invitationId);
    await createAuthenticatedCaller(db, invitee.id).invitations.accept({ token });

    const result = await refusal(
      createAuthenticatedCaller(db, stranger.id).invitations.accept({ token }),
    );

    expect(result.code).toBe('NOT_FOUND');
    expect(await membershipOf(stranger.id)).toBeUndefined();
  });

  it('refuses an expired invitation, with a message that says so', async () => {
    await db
      .update(spaceInvitation)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(spaceInvitation.id, invitationId));

    const result = await refusal(
      createAuthenticatedCaller(db, invitee.id).invitations.accept({
        token: tokenFor(invitationId),
      }),
    );

    expect(result.code).toBe('PRECONDITION_FAILED');
    expect(result.message).toMatch(/expired/i);
    expect(await membershipOf(invitee.id)).toBeUndefined();
  });

  it('refuses a revoked invitation', async () => {
    await asAdmin().invitations.revoke({ spaceId, invitationId });

    const result = await refusal(
      createAuthenticatedCaller(db, invitee.id).invitations.accept({
        token: tokenFor(invitationId),
      }),
    );

    expect(result.code).toBe('NOT_FOUND');
  });

  it('refuses a token that was never issued', async () => {
    const result = await refusal(
      createAuthenticatedCaller(db, invitee.id).invitations.accept({ token: 'not-a-token' }),
    );

    expect(result.code).toBe('NOT_FOUND');
  });

  it('requires a signed-in user', async () => {
    const result = await refusal(
      createTestCaller(db).invitations.accept({ token: tokenFor(invitationId) }),
    );

    expect(result.code).toBe('FORBIDDEN');
  });

  it('refuses a member who follows the link, and leaves it live for its invitee', async () => {
    // An admin follows a `member` link forwarded to them: no demotion, and the link they did
    // not need must not be spent under the invitee's feet.
    const token = tokenFor(invitationId);
    const result = await refusal(asAdmin().invitations.accept({ token }));

    expect(result.code).toBe('CONFLICT');
    expect(result.message).toMatch(/already a member/i);
    expect(await membershipOf(admin.id)).toEqual({ role: 'admin' });

    await createAuthenticatedCaller(db, invitee.id).invitations.accept({ token });
    expect(await membershipOf(invitee.id)).toEqual({ role: 'member' });
  });
});

describe('previewing an invitation', () => {
  it('shows the space, the role and the inviter to anyone holding the link', async () => {
    const invitation = await asAdmin().invitations.create({
      spaceId,
      email: invitee.email,
      role: 'admin',
    });

    const preview = await createTestCaller(db).invitations.preview({
      token: tokenFor(invitation.id),
    });

    expect(preview).toEqual({ spaceTitle: 'Cooking club', role: 'admin', inviterName: admin.name });
  });

  it('says so when the invitation has expired', async () => {
    const invitation = await asAdmin().invitations.create({
      spaceId,
      email: invitee.email,
      role: 'member',
    });
    await db
      .update(spaceInvitation)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(spaceInvitation.id, invitation.id));

    const result = await refusal(
      createTestCaller(db).invitations.preview({ token: tokenFor(invitation.id) }),
    );

    expect(result.code).toBe('PRECONDITION_FAILED');
  });
});

describe('pending invitations', () => {
  it('lists the space’s pending invitations to an admin, expired ones flagged', async () => {
    const fresh = await asAdmin().invitations.create({
      spaceId,
      email: 'fresh@example.com',
      role: 'member',
    });
    const stale = await asAdmin().invitations.create({
      spaceId,
      email: 'stale@example.com',
      role: 'member',
    });
    await db
      .update(spaceInvitation)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(spaceInvitation.id, stale.id));

    const pending = await asAdmin().invitations.list({ spaceId });

    expect(pending).toHaveLength(2);
    expect(pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: fresh.id, email: 'fresh@example.com', expired: false }),
        expect.objectContaining({ id: stale.id, email: 'stale@example.com', expired: true }),
      ]),
    );
  });

  it('does not list another space’s invitations', async () => {
    const other = await asAdmin().spaces.create({ title: 'Other' });
    await asAdmin().invitations.create({
      spaceId: other.id,
      email: invitee.email,
      role: 'member',
    });

    expect(await asAdmin().invitations.list({ spaceId })).toEqual([]);
  });

  it('refuses the list to a member who is not an admin', async () => {
    const result = await refusal(
      createAuthenticatedCaller(db, member.id).invitations.list({ spaceId }),
    );

    expect(result.code).toBe('FORBIDDEN');
  });

  it('refuses revoking to a member who is not an admin', async () => {
    const invitation = await asAdmin().invitations.create({
      spaceId,
      email: invitee.email,
      role: 'member',
    });

    const result = await refusal(
      createAuthenticatedCaller(db, member.id).invitations.revoke({
        spaceId,
        invitationId: invitation.id,
      }),
    );

    expect(result.code).toBe('FORBIDDEN');
    expect(await db.select().from(spaceInvitation)).toHaveLength(1);
  });

  it('cannot revoke another space’s invitation through this one', async () => {
    const other = await asAdmin().spaces.create({ title: 'Other' });
    const invitation = await asAdmin().invitations.create({
      spaceId: other.id,
      email: invitee.email,
      role: 'member',
    });

    const result = await refusal(
      asAdmin().invitations.revoke({ spaceId, invitationId: invitation.id }),
    );

    expect(result.code).toBe('NOT_FOUND');
    expect(await db.select().from(spaceInvitation)).toHaveLength(1);
  });
});
