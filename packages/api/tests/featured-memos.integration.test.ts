import { revokeOperator } from '@repo/auth/operator';
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

// Olivia is the operator, and a member of the club with Alice; Bob is a member of nothing.
beforeEach(async () => {
  await db.delete(memo);
  await db.delete(space);
  await db.delete(user);
  await db.insert(user).values([olivia, alice, bob]);
  await db.insert(space).values(club);
  await db.insert(spaceMember).values([
    { spaceId: club.id, userId: alice.id, role: 'admin', joinedAt: new Date() },
    { spaceId: club.id, userId: olivia.id, role: 'member', joinedAt: new Date() },
  ]);
});

const as = (u: { id: string; isOperator: boolean }) =>
  createAuthenticatedCaller(db, u.id, { isOperator: u.isOperator });

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

const publicMemosOf = (author: typeof alice, ...contents: string[]) =>
  writeInOrder((content) => as(author).memos.create({ content, visibility: 'public' }), ...contents);

const featuredAtOf = async (id: string) => {
  const [row] = await db.select({ featuredAt: memo.featuredAt, updatedAt: memo.updatedAt }).from(memo).where(eq(memo.id, id));
  return row!;
};

describe('featuring a public memo', () => {
  it('puts another user’s memo first on Explore, for every reader', async () => {
    const [older, newer] = await publicMemosOf(alice, 'Older', 'Newer');

    await as(olivia).memos.feature({ id: older! });

    const explored = await as(bob).memos.listPublic({});
    expect(ids(explored)).toEqual([older, newer]);
    expect(explored[0]!.featuredAt).toBeInstanceOf(Date);
    expect(explored[1]!.featuredAt).toBeNull();
  });
});

describe('who may feature a memo', () => {
  it('is an operator, on their own memo as on anyone’s', async () => {
    const [own] = await writeInOrder(
      (content) => as(olivia).memos.create({ content, visibility: 'public' }),
      'Welcome to Plume',
    );

    await as(olivia).memos.feature({ id: own! });

    expect((await featuredAtOf(own!)).featuredAt).toBeInstanceOf(Date);
  });

  it('is refused to anyone else, the memo’s author included', async () => {
    const [id] = await publicMemosOf(alice, 'Pasta night');

    expect((await refusal(as(alice).memos.feature({ id: id! }))).code).toBe('FORBIDDEN');
    expect((await featuredAtOf(id!)).featuredAt).toBeNull();
  });
});

describe('what may be featured', () => {
  it('is a public memo only: featuring must never show a memo to readers who may not read it', async () => {
    const { id: personal } = await as(olivia).memos.create({ content: 'Diary', visibility: 'private' });
    const { id: ofTheClub } = await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' });

    expect((await refusal(as(olivia).memos.feature({ id: personal }))).code).toBe('BAD_REQUEST');
    expect((await refusal(as(olivia).memos.feature({ id: ofTheClub }))).code).toBe('BAD_REQUEST');
  });

  it('is never a comment, which does not stand on its own on Explore', async () => {
    const [id] = await publicMemosOf(alice, 'Pasta night');
    const comment = await as(bob).memos.create({ content: 'Fresh pasta only', parentId: id! });

    expect((await refusal(as(olivia).memos.feature({ id: comment.id }))).code).toBe('BAD_REQUEST');
  });

  it('answers a memo the operator cannot read exactly as one that does not exist', async () => {
    const { id } = await as(alice).memos.create({ content: 'Diary', visibility: 'private' });

    expect(await refusal(as(olivia).memos.feature({ id }))).toEqual({ code: 'NOT_FOUND', message: 'Memo not found' });
    expect(await refusal(as(olivia).memos.feature({ id: 'missing' }))).toEqual({ code: 'NOT_FOUND', message: 'Memo not found' });
  });
});

describe('featuring and unfeaturing again', () => {
  it('keeps the date of the first featuring, so a memo never climbs back on its own', async () => {
    const [id] = await publicMemosOf(alice, 'Pasta night');

    await as(olivia).memos.feature({ id: id! });
    const { featuredAt } = await featuredAtOf(id!);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await as(olivia).memos.feature({ id: id! });

    expect((await featuredAtOf(id!)).featuredAt).toEqual(featuredAt);
  });

  it('unfeatures a memo, which takes its place by date again, and unfeaturing it twice changes nothing more', async () => {
    const [older, newer] = await publicMemosOf(alice, 'Older', 'Newer');

    await as(olivia).memos.feature({ id: older! });
    await as(olivia).memos.unfeature({ id: older! });
    await as(olivia).memos.unfeature({ id: older! });

    expect(ids(await as(bob).memos.listPublic({}))).toEqual([newer, older]);
    expect((await featuredAtOf(older!)).featuredAt).toBeNull();
  });

  it('refuses unfeaturing to anyone but an operator', async () => {
    const [id] = await publicMemosOf(alice, 'Pasta night');
    await as(olivia).memos.feature({ id: id! });

    expect((await refusal(as(alice).memos.unfeature({ id: id! }))).code).toBe('FORBIDDEN');
    expect((await featuredAtOf(id!)).featuredAt).toBeInstanceOf(Date);
  });

  it('leaves the memo’s update date alone, since no word of it changed', async () => {
    const { id, updatedAt } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'public' });

    await as(olivia).memos.feature({ id });
    expect((await featuredAtOf(id)).updatedAt).toEqual(updatedAt);
    await as(olivia).memos.unfeature({ id });
    expect((await featuredAtOf(id)).updatedAt).toEqual(updatedAt);
  });
});

describe('the order of Explore', () => {
  it('puts the latest featured on top, whenever the memo was written, then the rest newest first', async () => {
    const [first, second, third, fourth] = await publicMemosOf(alice, 'First', 'Second', 'Third', 'Fourth');

    await as(olivia).memos.feature({ id: third! });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await as(olivia).memos.feature({ id: first! });

    expect(ids(await as(bob).memos.listPublic({}))).toEqual([first, third, fourth, second]);
  });

  it('is the same in a filtered Explore, which only narrows it', async () => {
    const [cooking, other, alsoCooking] = await publicMemosOf(alice, 'Pasta #cooking', 'Gym', 'Risotto #cooking');

    await as(olivia).memos.feature({ id: cooking! });
    await as(olivia).memos.feature({ id: other! });

    expect(ids(await as(bob).memos.listPublic({ tag: 'cooking' }))).toEqual([cooking, alsoCooking]);
    expect(ids(await as(bob).memos.listPublic({ query: 'o' }))).toEqual([cooking, alsoCooking]);
    const today = new Date().toISOString().slice(0, 10);
    expect(ids(await as(bob).memos.listPublic({ date: today }))).toEqual([other, cooking, alsoCooking]);
  });

  it('still ignores pins, which belong to their author’s scope', async () => {
    const [older, newer] = await publicMemosOf(alice, 'Older', 'Newer');

    await as(alice).memos.pin({ id: older! });

    expect(ids(await as(bob).memos.listPublic({}))).toEqual([newer, older]);
  });
});

// A memo of a space is never featured, so only the personal list could be touched.
describe('the lists of a scope', () => {
  it('ignore featuring: the author’s pins alone arrange their personal list', async () => {
    const [pinned, featured, newest] = await publicMemosOf(alice, 'Pinned', 'Featured', 'Newest');

    await as(alice).memos.pin({ id: pinned! });
    await as(olivia).memos.feature({ id: featured! });

    expect(ids(await as(alice).memos.list({}))).toEqual([pinned, newest, featured]);
  });

});

describe('a featured memo that stops being public', () => {
  it('stays featured through an edit that keeps it public', async () => {
    const [id] = await publicMemosOf(alice, 'Pasta nihgt');
    await as(olivia).memos.feature({ id: id! });

    await as(alice).memos.update({ id: id!, content: 'Pasta night', visibility: 'public' });

    expect((await featuredAtOf(id!)).featuredAt).toBeInstanceOf(Date);
  });

  it('is unfeatured when its author makes it private, and not featured back when made public again', async () => {
    const [id] = await publicMemosOf(alice, 'Pasta night');
    await as(olivia).memos.feature({ id: id! });

    await as(alice).memos.update({ id: id!, content: 'Pasta night', visibility: 'private' });
    expect((await featuredAtOf(id!)).featuredAt).toBeNull();

    await as(alice).memos.update({ id: id!, content: 'Pasta night', visibility: 'public' });
    expect((await featuredAtOf(id!)).featuredAt).toBeNull();
  });

  it('is unfeatured when its author moves it into a space', async () => {
    const [id] = await publicMemosOf(alice, 'Pasta night');
    await as(olivia).memos.feature({ id: id! });

    await as(alice).memos.space.move({ spaceId: club.id, id: id! });
    expect((await featuredAtOf(id!)).featuredAt).toBeNull();

    await as(alice).memos.move({ id: id!, visibility: 'public' });
    expect((await featuredAtOf(id!)).featuredAt).toBeNull();
  });
});

describe('a featured memo whose operator loses the role', () => {
  it('stays featured: it belongs to Explore, not to whoever featured it', async () => {
    const [older, newer] = await publicMemosOf(alice, 'Older', 'Newer');
    await as(olivia).memos.feature({ id: older! });

    await revokeOperator(db, olivia.id);

    expect(ids(await as(bob).memos.listPublic({}))).toEqual([older, newer]);
  });
});
