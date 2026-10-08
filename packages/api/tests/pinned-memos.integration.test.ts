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

// Alice is an admin of the club, Bob a member; the outsider is a member of nothing.
beforeEach(async () => {
  await db.delete(memo);
  await db.delete(space);
  await db.delete(user);
  await db.insert(user).values([alice, bob, outsider]);
  await db.insert(space).values(club);
  await db.insert(spaceMember).values([
    { spaceId: club.id, userId: alice.id, role: 'admin', joinedAt: new Date() },
    { spaceId: club.id, userId: bob.id, role: 'member', joinedAt: new Date() },
  ]);
});

const as = (u: { id: string }) => createAuthenticatedCaller(db, u.id);

const ids = (memos: { id: string }[]) => memos.map((m) => m.id);

// Memos written one after the other get distinct creation dates, so the order is stable.
const writeInOrder = async (write: (content: string) => Promise<{ id: string }>, ...contents: string[]) => {
  const written = [];
  for (const content of contents) {
    written.push(await write(content));
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return written.map((m) => m.id);
};

const pinnedAtOf = async (id: string) => {
  const [row] = await db.select({ pinnedAt: memo.pinnedAt, updatedAt: memo.updatedAt }).from(memo).where(eq(memo.id, id));
  return row!;
};

describe('pinning a personal memo', () => {
  it('puts it first in its author’s list', async () => {
    const [older, newer] = await writeInOrder(
      (content) => as(alice).memos.create({ content, visibility: 'private' }),
      'Older',
      'Newer',
    );

    await as(alice).memos.pin({ id: older! });

    const listed = await as(alice).memos.list({});
    expect(ids(listed)).toEqual([older, newer]);
    expect(listed[0]!.pinnedAt).toBeInstanceOf(Date);
    expect(listed[1]!.pinnedAt).toBeNull();
  });

  it('is refused to anyone but its author, even on a public memo they may read', async () => {
    const { id } = await as(alice).memos.create({ content: 'Hello world', visibility: 'public' });

    expect((await refusal(as(bob).memos.pin({ id }))).code).toBe('FORBIDDEN');
  });

  it('answers a user who cannot read the memo exactly as for a memo that does not exist', async () => {
    const { id } = await as(alice).memos.create({ content: 'Diary', visibility: 'private' });

    expect(await refusal(as(bob).memos.pin({ id }))).toEqual({ code: 'NOT_FOUND', message: 'Memo not found' });
  });
});

describe('the order of the pinned memos', () => {
  it('puts the latest pin on top, whenever the memo was written, then the rest newest first', async () => {
    const [first, second, third, fourth] = await writeInOrder(
      (content) => as(alice).memos.create({ content, visibility: 'private' }),
      'First',
      'Second',
      'Third',
      'Fourth',
    );

    await as(alice).memos.pin({ id: third! });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await as(alice).memos.pin({ id: first! });

    expect(ids(await as(alice).memos.list({}))).toEqual([first, third, fourth, second]);
  });

  it('is the same in a filtered list, which only narrows it', async () => {
    const [cooking, other, alsoCooking] = await writeInOrder(
      (content) => as(alice).memos.create({ content, visibility: 'private' }),
      'Pasta #cooking',
      'Gym',
      'Risotto #cooking',
    );

    await as(alice).memos.pin({ id: cooking! });
    await as(alice).memos.pin({ id: other! });

    expect(ids(await as(alice).memos.list({ tag: 'cooking' }))).toEqual([cooking, alsoCooking]);
  });

  it('is ignored by Explore, which is no one’s scope', async () => {
    const [older, newer] = await writeInOrder(
      (content) => as(alice).memos.create({ content, visibility: 'public' }),
      'Older',
      'Newer',
    );

    await as(alice).memos.pin({ id: older! });

    expect(ids(await as(outsider).memos.listPublic({}))).toEqual([newer, older]);
  });
});

describe('pinning and unpinning again', () => {
  it('keeps the date of the first pin, so a memo never climbs back on its own', async () => {
    const { id } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'private' });

    await as(alice).memos.pin({ id });
    const { pinnedAt } = await pinnedAtOf(id);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await as(alice).memos.pin({ id });

    expect((await pinnedAtOf(id)).pinnedAt).toEqual(pinnedAt);
  });

  it('unpins a memo, and unpinning it twice changes nothing more', async () => {
    const { id } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'private' });

    await as(alice).memos.pin({ id });
    await as(alice).memos.unpin({ id });
    await as(alice).memos.unpin({ id });

    expect((await pinnedAtOf(id)).pinnedAt).toBeNull();
  });

  it('leaves the memo’s update date alone, since no word of it changed', async () => {
    const { id, updatedAt } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'private' });

    await as(alice).memos.pin({ id });

    expect((await pinnedAtOf(id)).updatedAt).toEqual(updatedAt);
  });
});

describe('pinning a memo of a space', () => {
  it('is open to an admin on another member’s memo, and every member sees it first', async () => {
    const [bobs, alices] = await writeInOrder(
      (content) => as(bob).memos.space.create({ spaceId: club.id, content }),
      'Bob’s memo',
      'Newer memo',
    );

    await as(alice).memos.pin({ id: bobs! });

    expect(ids(await as(bob).memos.space.list({ spaceId: club.id }))).toEqual([bobs, alices]);
  });

  it('is refused to a member, on their own memo too', async () => {
    const { id } = await as(bob).memos.space.create({ spaceId: club.id, content: 'Bob’s memo' });

    expect((await refusal(as(bob).memos.pin({ id }))).code).toBe('FORBIDDEN');
  });

  it('cannot be undone by the memo’s author when they are not an admin', async () => {
    const { id } = await as(bob).memos.space.create({ spaceId: club.id, content: 'Bob’s memo' });
    await as(alice).memos.pin({ id });

    expect((await refusal(as(bob).memos.unpin({ id }))).code).toBe('FORBIDDEN');
    expect((await pinnedAtOf(id)).pinnedAt).toBeInstanceOf(Date);
  });

  it('answers a non-member exactly as for a memo that does not exist', async () => {
    const { id } = await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' });

    expect(await refusal(as(outsider).memos.pin({ id }))).toEqual({ code: 'NOT_FOUND', message: 'Memo not found' });
  });
});

describe('a comment', () => {
  it('cannot be pinned: it has no scope of its own', async () => {
    const { id: memoId } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'private' });
    const comment = await as(alice).memos.create({ content: 'Fresh pasta only', parentId: memoId });

    expect((await refusal(as(alice).memos.pin({ id: comment.id }))).code).toBe('BAD_REQUEST');
  });
});

describe('a pinned memo changing hands', () => {
  it('stays pinned through an edit, which leaves it in its scope', async () => {
    const { id } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'private' });
    await as(alice).memos.pin({ id });

    await as(alice).memos.update({ id, content: 'Pasta night', visibility: 'public' });

    expect((await pinnedAtOf(id)).pinnedAt).toBeInstanceOf(Date);
  });

  it('is unpinned by a move into a space, where its author may not pin', async () => {
    const { id } = await as(bob).memos.create({ content: 'Pasta night', visibility: 'private' });
    await as(bob).memos.pin({ id });

    await as(bob).memos.space.move({ spaceId: club.id, id });

    expect((await pinnedAtOf(id)).pinnedAt).toBeNull();
  });

  it('is unpinned by a move out of a space, where nobody decided the pin', async () => {
    const { id } = await as(bob).memos.space.create({ spaceId: club.id, content: 'Pasta night' });
    await as(alice).memos.pin({ id });

    await as(bob).memos.move({ id, visibility: 'private' });

    expect((await pinnedAtOf(id)).pinnedAt).toBeNull();
  });
});
