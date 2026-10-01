import { type DatabaseInstance, eq, memo, space, spaceMember, user } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { startTestDatabase, stopTestDatabase } from './helpers/db';
import { createAuthenticatedCaller } from './helpers/trpc';

let db: DatabaseInstance;

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

const userRow = (id: string, name: string) => ({
  id,
  name,
  email: `${id}@example.com`,
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const alice = userRow('alice', 'Alice');
const bob = userRow('bob', 'Bob');
const carol = userRow('carol', 'Carol');
const outsider = userRow('outsider', 'Outsider');

const club = { id: 'club', title: 'Cooking club', createdAt: new Date(), updatedAt: new Date() };

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

// Alice is the club's only admin; Bob and Carol are members. Membership is written directly.
beforeEach(async () => {
  await db.delete(memo);
  await db.delete(space);
  await db.delete(user);
  await db.insert(user).values([alice, bob, carol, outsider]);
  await db.insert(space).values(club);
  await db.insert(spaceMember).values([
    { spaceId: club.id, userId: alice.id, role: 'admin', joinedAt: new Date('2026-01-01') },
    { spaceId: club.id, userId: bob.id, role: 'member', joinedAt: new Date('2026-01-02') },
    { spaceId: club.id, userId: carol.id, role: 'member', joinedAt: new Date('2026-01-03') },
  ]);
});

const as = (u: { id: string }) => createAuthenticatedCaller(db, u.id);

const rolesOf = async (spaceId: string) =>
  Object.fromEntries(
    (await db.select().from(spaceMember).where(eq(spaceMember.spaceId, spaceId))).map((m) => [
      m.userId,
      m.role,
    ]),
  );

describe('the member list', () => {
  it('shows an admin every member with their role', async () => {
    const members = await as(alice).spaces.members.list({ spaceId: club.id });

    expect(members).toEqual([
      expect.objectContaining({ userId: 'alice', name: 'Alice', email: 'alice@example.com', role: 'admin', isYou: true }),
      expect.objectContaining({ userId: 'bob', name: 'Bob', role: 'member', isYou: false }),
      expect.objectContaining({ userId: 'carol', name: 'Carol', role: 'member', isYou: false }),
    ]);
  });

  it('is refused to a member', async () => {
    expect((await refusal(as(bob).spaces.members.list({ spaceId: club.id }))).code).toBe('FORBIDDEN');
  });
});

describe('changing a role', () => {
  it('lets an admin promote a member to admin', async () => {
    await as(alice).spaces.members.changeRole({ spaceId: club.id, userId: bob.id, role: 'admin' });

    expect((await rolesOf(club.id)).bob).toBe('admin');
  });

  it('lets an admin demote another admin to member', async () => {
    await as(alice).spaces.members.changeRole({ spaceId: club.id, userId: bob.id, role: 'admin' });

    await as(alice).spaces.members.changeRole({ spaceId: club.id, userId: bob.id, role: 'member' });

    expect((await rolesOf(club.id)).bob).toBe('member');
  });

  it('lets an admin demote themselves while another admin remains', async () => {
    await as(alice).spaces.members.changeRole({ spaceId: club.id, userId: bob.id, role: 'admin' });

    await as(alice).spaces.members.changeRole({ spaceId: club.id, userId: alice.id, role: 'member' });

    expect(await rolesOf(club.id)).toEqual({ alice: 'member', bob: 'admin', carol: 'member' });
  });

  it('refuses the last admin demoting themselves', async () => {
    const result = await refusal(
      as(alice).spaces.members.changeRole({ spaceId: club.id, userId: alice.id, role: 'member' }),
    );

    expect(result.code).toBe('CONFLICT');
    expect((await rolesOf(club.id)).alice).toBe('admin');
  });

  it('is refused to a member', async () => {
    const result = await refusal(
      as(bob).spaces.members.changeRole({ spaceId: club.id, userId: bob.id, role: 'admin' }),
    );

    expect(result.code).toBe('FORBIDDEN');
    expect((await rolesOf(club.id)).bob).toBe('member');
  });

  it('answers a user who is not a member as not found', async () => {
    const result = await refusal(
      as(alice).spaces.members.changeRole({ spaceId: club.id, userId: outsider.id, role: 'admin' }),
    );

    expect(result).toEqual({ code: 'NOT_FOUND', message: 'Member not found' });
  });
});

describe('removing a member', () => {
  it('takes them out of the space, and leaves their memos in it with their byline', async () => {
    const written = await as(bob).memos.space.create({ spaceId: club.id, content: 'Pasta night' });

    await as(alice).spaces.members.remove({ spaceId: club.id, userId: bob.id });

    expect(await rolesOf(club.id)).toEqual({ alice: 'admin', carol: 'member' });
    expect(await as(carol).memos.space.list({ spaceId: club.id })).toEqual([
      expect.objectContaining({
        id: written.id,
        userId: bob.id,
        author: expect.objectContaining({ name: 'Bob' }),
      }),
    ]);
  });

  it('leaves their personal memos as they were', async () => {
    const personal = await as(bob).memos.create({ content: 'My own notes', visibility: 'private' });
    await as(bob).memos.space.create({ spaceId: club.id, content: 'Pasta night' });

    await as(alice).spaces.members.remove({ spaceId: club.id, userId: bob.id });

    expect((await as(bob).memos.list({})).map((m) => m.id)).toEqual([personal.id]);
  });

  it('is refused to a member', async () => {
    const result = await refusal(as(bob).spaces.members.remove({ spaceId: club.id, userId: carol.id }));

    expect(result.code).toBe('FORBIDDEN');
    expect(await rolesOf(club.id)).toHaveProperty('carol');
  });

  it('refuses taking out the last admin', async () => {
    const result = await refusal(as(alice).spaces.members.remove({ spaceId: club.id, userId: alice.id }));

    expect(result.code).toBe('CONFLICT');
  });
});

describe('leaving a space', () => {
  it('takes a member out, who immediately stops reading it', async () => {
    const written = await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' });

    await as(bob).spaces.leave({ spaceId: club.id });

    const notFound = { code: 'NOT_FOUND', message: 'Space not found' };
    expect(await refusal(as(bob).memos.space.list({ spaceId: club.id }))).toEqual(notFound);
    expect(await refusal(as(bob).memos.getById({ id: written.id }))).toEqual({
      code: 'NOT_FOUND',
      message: 'Memo not found',
    });
    expect(await as(bob).spaces.list()).toEqual([]);
  });

  it('lets an admin go while another admin remains', async () => {
    await as(alice).spaces.members.changeRole({ spaceId: club.id, userId: bob.id, role: 'admin' });

    await as(alice).spaces.leave({ spaceId: club.id });

    expect(await rolesOf(club.id)).toEqual({ bob: 'admin', carol: 'member' });
  });

  it('is refused to the last admin', async () => {
    const result = await refusal(as(alice).spaces.leave({ spaceId: club.id }));

    expect(result).toEqual({
      code: 'CONFLICT',
      message: 'A space needs an admin. Make someone else an admin first.',
    });
    expect((await rolesOf(club.id)).alice).toBe('admin');
  });

  it('answers a non-member as if the space did not exist', async () => {
    expect(await refusal(as(outsider).spaces.leave({ spaceId: club.id }))).toEqual({
      code: 'NOT_FOUND',
      message: 'Space not found',
    });
  });
});

describe('the headcount a member reads', () => {
  it('counts the members and the admins, so the interface can warn the last admin', async () => {
    expect(await as(bob).spaces.get({ spaceId: club.id })).toEqual(
      expect.objectContaining({ memberCount: 3, adminCount: 1 }),
    );

    await as(alice).spaces.members.changeRole({ spaceId: club.id, userId: bob.id, role: 'admin' });

    expect(await as(bob).spaces.get({ spaceId: club.id })).toEqual(
      expect.objectContaining({ memberCount: 3, adminCount: 2 }),
    );
  });
});

describe('renaming a space', () => {
  it('lets an admin give it a new title, which every member sees', async () => {
    await as(alice).spaces.rename({ spaceId: club.id, title: '  Baking club  ' });

    expect(await as(bob).spaces.get({ spaceId: club.id })).toEqual(
      expect.objectContaining({ title: 'Baking club' }),
    );
  });

  it('is refused to a member', async () => {
    const result = await refusal(as(bob).spaces.rename({ spaceId: club.id, title: 'Bob’s club' }));

    expect(result.code).toBe('FORBIDDEN');
    expect((await as(bob).spaces.get({ spaceId: club.id })).title).toBe('Cooking club');
  });
});

describe('deleting a space', () => {
  it('takes its memos and their comments with it', async () => {
    const written = await as(bob).memos.space.create({ spaceId: club.id, content: 'Pasta night' });
    await as(carol).memos.create({ parentId: written.id, content: 'Count me in' });
    const personal = await as(bob).memos.create({ content: 'My own notes', visibility: 'private' });

    await as(alice).spaces.delete({ spaceId: club.id });

    expect(await db.select({ id: memo.id }).from(memo)).toEqual([{ id: personal.id }]);
    expect(await as(alice).spaces.list()).toEqual([]);
    expect(await refusal(as(alice).spaces.get({ spaceId: club.id }))).toEqual({
      code: 'NOT_FOUND',
      message: 'Space not found',
    });
  });

  it('is refused to a member, and leaves it whole', async () => {
    await as(bob).memos.space.create({ spaceId: club.id, content: 'Pasta night' });

    const result = await refusal(as(bob).spaces.delete({ spaceId: club.id }));

    expect(result.code).toBe('FORBIDDEN');
    expect(await as(bob).memos.space.list({ spaceId: club.id })).toHaveLength(1);
  });
});

describe('another member’s memo', () => {
  let memoId: string;

  beforeEach(async () => {
    memoId = (await as(bob).memos.space.create({ spaceId: club.id, content: 'Pasta night' })).id;
  });

  it('can be deleted by an admin', async () => {
    await as(alice).memos.delete({ id: memoId });

    expect(await as(bob).memos.space.list({ spaceId: club.id })).toEqual([]);
  });

  it('cannot be edited by an admin, whose words would appear under its author’s name', async () => {
    const result = await refusal(
      as(alice).memos.update({ id: memoId, content: 'Alice was here', visibility: 'space' }),
    );

    expect(result.code).toBe('FORBIDDEN');
    expect((await as(bob).memos.getById({ id: memoId })).content).toBe('Pasta night');
  });

  it('cannot be deleted by a member', async () => {
    const result = await refusal(as(carol).memos.delete({ id: memoId }));

    expect(result.code).toBe('FORBIDDEN');
    expect(await as(bob).memos.space.list({ spaceId: club.id })).toHaveLength(1);
  });

  it('has comments an admin may delete, and a member may not', async () => {
    const comment = await as(carol).memos.create({ parentId: memoId, content: 'Count me in' });

    expect((await refusal(as(bob).memos.delete({ id: comment.id }))).code).toBe('FORBIDDEN');
    await as(alice).memos.delete({ id: comment.id });

    expect(await as(bob).memos.listComments({ memoId })).toEqual([]);
  });

  it('is out of reach of an admin who has left the space', async () => {
    await as(alice).spaces.members.changeRole({ spaceId: club.id, userId: carol.id, role: 'admin' });
    await as(alice).spaces.leave({ spaceId: club.id });

    expect(await refusal(as(alice).memos.delete({ id: memoId }))).toEqual({
      code: 'NOT_FOUND',
      message: 'Memo not found',
    });
  });
});

describe('the last admin, under concurrent changes', () => {
  it('survives two admins demoting each other at the same time', async () => {
    await as(alice).spaces.members.changeRole({ spaceId: club.id, userId: bob.id, role: 'admin' });

    const results = await Promise.allSettled([
      as(alice).spaces.members.changeRole({ spaceId: club.id, userId: bob.id, role: 'member' }),
      as(bob).spaces.members.changeRole({ spaceId: club.id, userId: alice.id, role: 'member' }),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(Object.values(await rolesOf(club.id))).toContain('admin');
  });

  it('survives two admins leaving at the same time', async () => {
    await as(alice).spaces.members.changeRole({ spaceId: club.id, userId: bob.id, role: 'admin' });

    await Promise.allSettled([
      as(alice).spaces.leave({ spaceId: club.id }),
      as(bob).spaces.leave({ spaceId: club.id }),
    ]);

    expect(Object.values(await rolesOf(club.id))).toContain('admin');
  });
});
