import { type DatabaseInstance, memo, space, spaceMember, user } from '@repo/db';
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

const userRow = (id: string, name: string, isOperator = false) => ({
  id,
  name,
  email: `${id}@example.com`,
  emailVerified: true,
  image: null,
  isOperator,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const olivia = userRow('olivia', 'Olivia', true);
const alice = userRow('alice', 'Alice');
const bob = userRow('bob', 'Bob');

const club = { id: 'club', title: 'Cooking club', createdAt: new Date(), updatedAt: new Date() };
const choir = { id: 'choir', title: 'Choir', createdAt: new Date(), updatedAt: new Date() };

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

// Olivia is the operator, a member of the club where Alice is admin; the choir is Alice's and
// Bob's, and Olivia is not in it.
beforeEach(async () => {
  await db.delete(memo);
  await db.delete(space);
  await db.delete(user);
  await db.insert(user).values([olivia, alice, bob]);
  await db.insert(space).values([club, choir]);
  await db.insert(spaceMember).values([
    { spaceId: club.id, userId: alice.id, role: 'admin', joinedAt: new Date() },
    { spaceId: club.id, userId: olivia.id, role: 'member', joinedAt: new Date() },
    { spaceId: choir.id, userId: alice.id, role: 'admin', joinedAt: new Date() },
    { spaceId: choir.id, userId: bob.id, role: 'member', joinedAt: new Date() },
  ]);
});

const as = (u: { id: string; isOperator: boolean }) =>
  createAuthenticatedCaller(db, u.id, { isOperator: u.isOperator });

const ids = (memos: { id: string }[]) => memos.map((m) => m.id);

describe('an operator deleting a public memo', () => {
  it('removes another user’s memo from Explore and from its author’s list, with its comments', async () => {
    const { id: memoId } = await as(alice).memos.create({ content: 'Buy cheap pills', visibility: 'public' });
    await as(bob).memos.create({ content: 'Spam indeed', parentId: memoId });

    await as(olivia).memos.delete({ id: memoId });

    expect(ids(await as(bob).memos.listPublic({}))).toEqual([]);
    expect(ids(await as(alice).memos.list({}))).toEqual([]);
    expect(await refusal(as(alice).memos.listComments({ memoId }))).toEqual({
      code: 'NOT_FOUND',
      message: 'Memo not found',
    });
  });
});

describe('an operator deleting a comment', () => {
  it('removes another user’s comment on a public memo, and leaves the memo', async () => {
    const { id: memoId } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'public' });
    const { id: commentId } = await as(bob).memos.create({ content: 'Insults', parentId: memoId });

    await as(olivia).memos.delete({ id: commentId });

    expect(await as(alice).memos.listComments({ memoId })).toEqual([]);
    expect(ids(await as(bob).memos.listPublic({}))).toEqual([memoId]);
  });

  it('removes a comment written before its memo was made public', async () => {
    const { id: memoId } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'private' });
    const { id: commentId } = await as(alice).memos.create({ content: 'Fresh pasta only', parentId: memoId });
    await as(alice).memos.update({ id: memoId, content: 'Pasta night', visibility: 'public' });

    await as(olivia).memos.delete({ id: commentId });

    expect(await as(alice).memos.listComments({ memoId })).toEqual([]);
  });

  it('removes a comment on their own public memo, whoever wrote it', async () => {
    const { id: memoId } = await as(olivia).memos.create({ content: 'Welcome to Plume', visibility: 'public' });
    const { id: commentId } = await as(bob).memos.create({ content: 'Insults', parentId: memoId });

    await as(olivia).memos.delete({ id: commentId });

    expect(await as(olivia).memos.listComments({ memoId })).toEqual([]);
  });
});

describe('a featured memo', () => {
  it('can be deleted by an operator, and leaves Explore', async () => {
    const { id: memoId } = await as(alice).memos.create({ content: 'Buy cheap pills', visibility: 'public' });
    await as(olivia).memos.feature({ id: memoId });

    await as(olivia).memos.delete({ id: memoId });

    expect(ids(await as(bob).memos.listPublic({}))).toEqual([]);
  });
});

describe('what is out of an operator’s reach', () => {
  const missing = { code: 'NOT_FOUND', message: 'Memo not found' };

  it('is another user’s private memo, which answers as a missing one', async () => {
    const { id: memoId } = await as(alice).memos.create({ content: 'Diary', visibility: 'private' });

    expect(await refusal(as(olivia).memos.delete({ id: memoId }))).toEqual(missing);
    expect(ids(await as(alice).memos.list({}))).toEqual([memoId]);
  });

  it('is a memo of a space they are not a member of, which answers as a missing one', async () => {
    const { id: memoId } = await as(alice).memos.space.create({ spaceId: choir.id, content: 'Rehearsal' });

    expect(await refusal(as(olivia).memos.delete({ id: memoId }))).toEqual(missing);
  });

  it('is a memo made private again, as is a comment under it', async () => {
    const { id: memoId } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'public' });
    const { id: commentId } = await as(alice).memos.create({ content: 'Fresh pasta only', parentId: memoId });
    await as(alice).memos.update({ id: memoId, content: 'Pasta night', visibility: 'private' });

    expect(await refusal(as(olivia).memos.delete({ id: memoId }))).toEqual(missing);
    expect(await refusal(as(olivia).memos.delete({ id: commentId }))).toEqual(missing);
    expect(ids(await as(alice).memos.listComments({ memoId }))).toEqual([commentId]);
  });
});

describe('an operator who is a member of a space', () => {
  it('has exactly their role’s delete powers there: their own memo, not another member’s', async () => {
    const { id: own } = await as(olivia).memos.space.create({ spaceId: club.id, content: 'My recipe' });
    const { id: alices } = await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' });

    await as(olivia).memos.delete({ id: own });

    expect((await refusal(as(olivia).memos.delete({ id: alices }))).code).toBe('FORBIDDEN');
    expect(ids(await as(alice).memos.space.list({ spaceId: club.id }))).toEqual([alices]);
  });

  it('as an admin there, deletes another member’s memo by their role', async () => {
    await db.insert(spaceMember).values({ spaceId: choir.id, userId: olivia.id, role: 'admin', joinedAt: new Date() });
    const { id: bobs } = await as(bob).memos.space.create({ spaceId: choir.id, content: 'Rehearsal' });

    await as(olivia).memos.delete({ id: bobs });

    expect(ids(await as(bob).memos.space.list({ spaceId: choir.id }))).toEqual([]);
  });
});

describe('a user who is not an operator', () => {
  it('is refused as forbidden on another user’s public memo and on a comment under it', async () => {
    const { id: memoId } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'public' });
    const { id: commentId } = await as(alice).memos.create({ content: 'Fresh pasta only', parentId: memoId });

    expect((await refusal(as(bob).memos.delete({ id: memoId }))).code).toBe('FORBIDDEN');
    expect((await refusal(as(bob).memos.delete({ id: commentId }))).code).toBe('FORBIDDEN');
    expect(ids(await as(bob).memos.listPublic({}))).toEqual([memoId]);
  });
});
