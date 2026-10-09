import { type DatabaseInstance, memo, notification, outbox, reaction, space, spaceMember, user } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { startTestDatabase, stopTestDatabase } from './helpers/db';
import { createAuthenticatedCaller, createTestCaller } from './helpers/trpc';

// A reader leaves a reaction on a memo: one emoji of a fixed set, one per reader per memo,
// shown to every reader of the memo as a summary — each emoji, how many chose it, and who.

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

// The error a caller sees, reduced to its code.
const refusal = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => {
      throw new Error('expected the call to be refused');
    },
    (e: unknown) => e,
  );
  if (!(error instanceof TRPCError)) throw error;
  return error.code;
};

// Alice, Bob and Carol are members of the club; the outsider is a member of nothing.
beforeEach(async () => {
  await db.delete(outbox);
  await db.delete(memo);
  await db.delete(space);
  await db.delete(user);
  await db.insert(user).values([alice, bob, carol, outsider]);
  await db.insert(space).values(club);
  await db.insert(spaceMember).values(
    [alice, bob, carol].map(({ id }) => ({ spaceId: club.id, userId: id, role: 'member' as const, joinedAt: new Date() })),
  );
});

const as = (u: { id: string }) => createAuthenticatedCaller(db, u.id);
const anonymous = () => createTestCaller(db);

const writePublic = (author: { id: string }, content = 'A memo') =>
  as(author).memos.create({ content, visibility: 'public' });

const reactionsOn = async (reader: { id: string }, memoId: string) =>
  (await as(reader).memos.getById({ id: memoId })).reactions;

describe('reacting to a memo', () => {
  it('shows the emoji with one reaction, marked as theirs for the reader and named for every reader', async () => {
    const { id } = await writePublic(alice);

    await as(bob).memos.react({ memoId: id, emoji: '👍' });

    expect(await reactionsOn(bob, id)).toEqual([
      { emoji: '👍', count: 1, reactedByMe: true, reactors: [{ id: bob.id, name: 'Bob' }] },
    ]);
    expect(await reactionsOn(carol, id)).toEqual([
      { emoji: '👍', count: 1, reactedByMe: false, reactors: [{ id: bob.id, name: 'Bob' }] },
    ]);
  });
});

describe('changing one’s reaction', () => {
  it('replaces the reaction when the reader picks another emoji', async () => {
    const { id } = await writePublic(alice);

    await as(bob).memos.react({ memoId: id, emoji: '👍' });
    await as(bob).memos.react({ memoId: id, emoji: '🎉' });

    expect(await reactionsOn(bob, id)).toEqual([
      { emoji: '🎉', count: 1, reactedByMe: true, reactors: [{ id: bob.id, name: 'Bob' }] },
    ]);
  });

  it('changes nothing when the reader picks the same emoji again', async () => {
    const { id } = await writePublic(alice);

    await as(bob).memos.react({ memoId: id, emoji: '👍' });
    await as(bob).memos.react({ memoId: id, emoji: '👍' });

    expect(await reactionsOn(bob, id)).toEqual([
      { emoji: '👍', count: 1, reactedByMe: true, reactors: [{ id: bob.id, name: 'Bob' }] },
    ]);
  });

  it('takes the reaction back with unreact, which is harmless without one', async () => {
    const { id } = await writePublic(alice);

    await as(bob).memos.react({ memoId: id, emoji: '👍' });
    await as(bob).memos.unreact({ memoId: id });
    await as(bob).memos.unreact({ memoId: id });

    expect(await reactionsOn(bob, id)).toEqual([]);
  });
});

describe('several readers reacting', () => {
  it('counts each emoji, in the order of the set, leaving out the emojis nobody chose', async () => {
    const { id } = await writePublic(alice);

    await as(bob).memos.react({ memoId: id, emoji: '😢' });
    await as(carol).memos.react({ memoId: id, emoji: '👍' });
    await as(outsider).memos.react({ memoId: id, emoji: '😢' });
    await as(alice).memos.react({ memoId: id, emoji: '🎉' });
    await as(alice).memos.unreact({ memoId: id });

    expect(
      (await reactionsOn(bob, id)).map(({ emoji, count, reactedByMe }) => ({ emoji, count, reactedByMe })),
    ).toEqual([
      { emoji: '👍', count: 1, reactedByMe: false },
      { emoji: '😢', count: 2, reactedByMe: true },
    ]);
  });

  it('lets the author react to their own memo', async () => {
    const { id } = await writePublic(alice);

    await as(alice).memos.react({ memoId: id, emoji: '❤️' });

    expect(await reactionsOn(alice, id)).toEqual([
      { emoji: '❤️', count: 1, reactedByMe: true, reactors: [{ id: alice.id, name: 'Alice' }] },
    ]);
  });
});

describe('who may react', () => {
  it('refuses an anonymous caller', async () => {
    const { id } = await writePublic(alice);

    expect(await refusal(anonymous().memos.react({ memoId: id, emoji: '👍' }))).toBe('FORBIDDEN');
  });

  it('answers NOT_FOUND on a memo the caller cannot read, to react and to unreact', async () => {
    const privateMemo = await as(alice).memos.create({ content: 'Diary', visibility: 'private' });
    const clubMemo = await as(alice).memos.space.create({ spaceId: club.id, content: 'Menu' });

    for (const memoId of [privateMemo.id, clubMemo.id]) {
      expect(await refusal(as(outsider).memos.react({ memoId, emoji: '👍' }))).toBe('NOT_FOUND');
      expect(await refusal(as(outsider).memos.unreact({ memoId }))).toBe('NOT_FOUND');
    }
  });

  it('rejects an emoji outside the set', async () => {
    const { id } = await writePublic(alice);

    expect(await refusal(as(bob).memos.react({ memoId: id, emoji: '👎' as never }))).toBe('BAD_REQUEST');
  });
});

describe('reading reactions', () => {
  it('carries the summary in a personal list, a space list, Explore and a memo’s page', async () => {
    const personal = await as(alice).memos.create({ content: 'Diary', visibility: 'private' });
    const shared = await as(alice).memos.space.create({ spaceId: club.id, content: 'Menu' });
    const published = await writePublic(alice);
    await as(alice).memos.react({ memoId: personal.id, emoji: '💡' });
    await as(bob).memos.react({ memoId: shared.id, emoji: '🙏' });
    await as(bob).memos.react({ memoId: published.id, emoji: '😂' });

    const emojisOf = (memos: { id: string; reactions: { emoji: string }[] }[], id: string) =>
      memos.find((m) => m.id === id)!.reactions.map(({ emoji }) => emoji);

    expect(emojisOf(await as(alice).memos.list({}), personal.id)).toEqual(['💡']);
    expect(emojisOf(await as(alice).memos.space.list({ spaceId: club.id }), shared.id)).toEqual(['🙏']);
    expect(emojisOf(await as(alice).memos.listPublic({}), published.id)).toEqual(['😂']);
    expect((await as(alice).memos.getById({ id: published.id })).reactions.map(({ emoji }) => emoji)).toEqual(['😂']);
  });

  it('shows an anonymous reader of Explore the counts and the names, none of them theirs', async () => {
    const { id } = await writePublic(alice);
    await as(bob).memos.react({ memoId: id, emoji: '👍' });

    const [read] = await anonymous().memos.listPublic({});

    expect(read!.reactions).toEqual([
      { emoji: '👍', count: 1, reactedByMe: false, reactors: [{ id: bob.id, name: 'Bob' }] },
    ]);
  });
});

describe('reactions over time', () => {
  it('clears the memo’s reactions when it moves to another audience', async () => {
    const { id } = await writePublic(alice);
    await as(bob).memos.react({ memoId: id, emoji: '👍' });

    await as(alice).memos.space.move({ spaceId: club.id, id });

    expect(await reactionsOn(alice, id)).toEqual([]);
  });

  it('keeps them when a personal memo switches between private and public', async () => {
    const { id } = await writePublic(alice);
    await as(alice).memos.react({ memoId: id, emoji: '🎉' });

    await as(alice).memos.update({ id, content: 'A memo', visibility: 'private' });
    await as(alice).memos.update({ id, content: 'A memo, edited', visibility: 'public' });

    expect((await reactionsOn(alice, id)).map(({ emoji }) => emoji)).toEqual(['🎉']);
  });

  it('removes the reactions of a deleted memo', async () => {
    const { id } = await writePublic(alice);
    await as(bob).memos.react({ memoId: id, emoji: '👍' });

    await as(alice).memos.delete({ id });

    expect(await db.select().from(reaction)).toEqual([]);
  });

  it('creates no notification and records no outbox event', async () => {
    const { id } = await writePublic(alice);

    await as(bob).memos.react({ memoId: id, emoji: '👍' });

    expect(await db.select().from(notification)).toEqual([]);
    expect(await db.select().from(outbox)).toEqual([]);
  });
});
