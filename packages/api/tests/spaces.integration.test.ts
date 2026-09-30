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

beforeEach(async () => {
  await db.delete(memo);
  await db.delete(space);
  await db.delete(user);
});

const userRow = (id: string) => ({
  id,
  name: id,
  email: `${id}@example.com`,
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const creator = userRow('creator');
const outsider = userRow('outsider');

const memoRow = (overrides: Partial<typeof memo.$inferInsert>) => ({
  id: 'memo-1',
  userId: creator.id,
  content: 'a memo',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// The error a caller sees, reduced to what crosses the wire: two refusals that differ
// only in their stack trace are indistinguishable to a client.
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

describe('creating a space', () => {
  beforeEach(async () => {
    await db.insert(user).values([creator, outsider]);
  });

  it('makes its creator its admin', async () => {
    const caller = createAuthenticatedCaller(db, creator.id);

    const created = await caller.spaces.create({ title: 'Cooking club' });

    expect(created.title).toBe('Cooking club');
    const members = await db
      .select()
      .from(spaceMember)
      .where(eq(spaceMember.spaceId, created.id));
    expect(members).toEqual([
      expect.objectContaining({ userId: creator.id, role: 'admin' }),
    ]);
  });

  it('trims the title', async () => {
    const caller = createAuthenticatedCaller(db, creator.id);

    const created = await caller.spaces.create({ title: '  Cooking club  ' });

    expect(created.title).toBe('Cooking club');
  });

  it('refuses a blank title', async () => {
    const caller = createAuthenticatedCaller(db, creator.id);

    await expect(caller.spaces.create({ title: '   ' })).rejects.toThrow();
    expect(await db.select().from(space)).toEqual([]);
  });

  it('leaves no space behind when its first membership cannot be written', async () => {
    // A session whose user row does not exist: the space insert succeeds on its own, the
    // membership insert fails on its foreign key. Without a transaction, a space with no
    // governor would survive.
    const caller = createAuthenticatedCaller(db, 'no-such-user');

    await expect(caller.spaces.create({ title: 'Orphan' })).rejects.toThrow();
    expect(await db.select().from(space)).toEqual([]);
  });
});

describe('listing spaces', () => {
  beforeEach(async () => {
    await db.insert(user).values([creator, outsider]);
  });

  it('returns only the spaces the user is a member of, with their role', async () => {
    const creatorCaller = createAuthenticatedCaller(db, creator.id);
    const outsiderCaller = createAuthenticatedCaller(db, outsider.id);
    const mine = await creatorCaller.spaces.create({ title: 'Cooking club' });
    await outsiderCaller.spaces.create({ title: 'Book club' });

    const result = await creatorCaller.spaces.list();

    expect(result).toEqual([{ id: mine.id, title: 'Cooking club', role: 'admin' }]);
  });

  it('orders the spaces by title', async () => {
    const caller = createAuthenticatedCaller(db, creator.id);
    await caller.spaces.create({ title: 'Running' });
    await caller.spaces.create({ title: 'Cooking club' });

    const result = await caller.spaces.list();

    expect(result.map((s) => s.title)).toEqual(['Cooking club', 'Running']);
  });
});

describe('reading a space', () => {
  beforeEach(async () => {
    await db.insert(user).values([creator, outsider]);
  });

  it('returns the space and the reader role to a member', async () => {
    const caller = createAuthenticatedCaller(db, creator.id);
    const created = await caller.spaces.create({ title: 'Cooking club' });

    const result = await caller.spaces.get({ spaceId: created.id });

    expect(result).toEqual({ id: created.id, title: 'Cooking club', role: 'admin' });
  });

  it('answers a non-member exactly as it answers a space that does not exist', async () => {
    const created = await createAuthenticatedCaller(db, creator.id).spaces.create({
      title: 'Cooking club',
    });
    const outsiderCaller = createAuthenticatedCaller(db, outsider.id);

    const forExisting = await refusal(outsiderCaller.spaces.get({ spaceId: created.id }));
    const forMissing = await refusal(outsiderCaller.spaces.get({ spaceId: 'no-such-space' }));

    expect(forExisting).toEqual({ code: 'NOT_FOUND', message: 'Space not found' });
    expect(forMissing).toEqual(forExisting);
  });
});

describe('the memos of a space', () => {
  let spaceId: string;

  beforeEach(async () => {
    await db.insert(user).values([creator, outsider]);
    spaceId = (
      await createAuthenticatedCaller(db, creator.id).spaces.create({ title: 'Cooking club' })
    ).id;
    // The creator has personal memos: a space view that ignored its scope would show them.
    await db.insert(memo).values(
      memoRow({ id: 'personal-memo', content: 'a personal memo #cooking', tags: ['cooking'] }),
    );
  });

  it('are empty in a new space, whatever the member writes elsewhere', async () => {
    const caller = createAuthenticatedCaller(db, creator.id);

    expect(await caller.memos.space.list({ spaceId })).toEqual([]);
    expect(await caller.memos.space.tags({ spaceId })).toEqual({});
    expect(await caller.memos.space.stats({ spaceId })).toEqual({});
  });

  it('are the memos placed in the space, and only those', async () => {
    await db.insert(memo).values(
      memoRow({
        id: 'space-memo',
        content: 'a memo in the space #baking',
        visibility: 'space',
        spaceId,
        tags: ['baking'],
      }),
    );
    const caller = createAuthenticatedCaller(db, creator.id);

    expect((await caller.memos.space.list({ spaceId })).map((m) => m.id)).toEqual([
      'space-memo',
    ]);
    expect(await caller.memos.space.tags({ spaceId })).toEqual({ baking: 1 });
    expect(Object.values(await caller.memos.space.stats({ spaceId }))).toEqual([1]);
  });

  it('do not reach the personal views of their author', async () => {
    await db.insert(memo).values(
      memoRow({ id: 'space-memo', visibility: 'space', spaceId }),
    );
    const caller = createAuthenticatedCaller(db, creator.id);

    expect((await caller.memos.list({})).map((m) => m.id)).toEqual(['personal-memo']);
    expect(await caller.memos.tags()).toEqual({ cooking: 1 });
  });

  it('are refused to a non-member as if the space did not exist', async () => {
    const caller = createAuthenticatedCaller(db, outsider.id);
    const expected = { code: 'NOT_FOUND', message: 'Space not found' };

    expect(await refusal(caller.memos.space.list({ spaceId }))).toEqual(expected);
    expect(await refusal(caller.memos.space.tags({ spaceId }))).toEqual(expected);
    expect(await refusal(caller.memos.space.stats({ spaceId }))).toEqual(expected);
  });
});
