import { type DatabaseInstance, eq, memo, space, user } from '@repo/db';
import { startTestDatabase, stopTestDatabase } from './helpers/db';
import { createAuthenticatedCaller, createTestCaller } from './helpers/trpc';

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

const testUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const outsider = {
  id: 'outsider-id',
  name: 'Outsider',
  email: 'outsider@example.com',
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testSpace = {
  id: 'space-1',
  title: 'Cooking club',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const memoRow = (overrides: Partial<typeof memo.$inferInsert>) => ({
  id: 'memo-1',
  userId: testUser.id,
  content: 'a memo',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('the space/visibility equivalence', () => {
  beforeEach(async () => {
    await db.insert(user).values(testUser);
    await db.insert(space).values(testSpace);
  });

  it('rejects a memo in a space whose visibility is not space', async () => {
    await expect(
      db.insert(memo).values(memoRow({ visibility: 'private', spaceId: testSpace.id })),
    ).rejects.toThrow();
  });

  it('rejects a memo whose visibility is space with no space', async () => {
    await expect(
      db.insert(memo).values(memoRow({ visibility: 'space', spaceId: null })),
    ).rejects.toThrow();
  });

  it('accepts a memo in a space whose visibility is space', async () => {
    await db.insert(memo).values(memoRow({ visibility: 'space', spaceId: testSpace.id }));

    const [row] = await db.select().from(memo);
    expect(row?.spaceId).toBe(testSpace.id);
  });
});

describe('the personal scope', () => {
  beforeEach(async () => {
    await db.insert(user).values(testUser);
    await db.insert(space).values(testSpace);
    await db.insert(memo).values([
      memoRow({
        id: 'personal-memo',
        content: 'a personal memo #cooking',
        tags: ['cooking'],
      }),
      memoRow({
        id: 'space-memo',
        content: 'a memo in a space #baking',
        visibility: 'space',
        spaceId: testSpace.id,
        tags: ['baking'],
      }),
    ]);
  });

  it('leaves the author space memos out of their memo list', async () => {
    const caller = createAuthenticatedCaller(db, testUser.id);

    const result = await caller.memos.list({});

    expect(result.map((m) => m.id)).toEqual(['personal-memo']);
  });

  it('leaves the author space memos out of their search results', async () => {
    const caller = createAuthenticatedCaller(db, testUser.id);

    const result = await caller.memos.list({ query: 'memo' });

    expect(result.map((m) => m.id)).toEqual(['personal-memo']);
  });

  it('leaves the author space memos out of their tag tree', async () => {
    const caller = createAuthenticatedCaller(db, testUser.id);

    const result = await caller.memos.tags();

    expect(result).toEqual({ cooking: 1 });
  });

  it('leaves the author space memos out of their activity', async () => {
    const caller = createAuthenticatedCaller(db, testUser.id);

    const result = await caller.memos.stats();

    expect(Object.values(result)).toEqual([1]);
  });
});

describe('reading one memo by id', () => {
  beforeEach(async () => {
    await db.insert(user).values([testUser, outsider]);
    await db.insert(space).values(testSpace);
  });

  it('refuses a space memo to a user outside the space', async () => {
    await db.insert(memo).values(memoRow({ visibility: 'space', spaceId: testSpace.id }));

    const caller = createAuthenticatedCaller(db, outsider.id);

    // Indistinguishable from the memo not existing: an identifier must not become an
    // oracle for what a space contains.
    await expect(caller.memos.getById({ id: 'memo-1' })).rejects.toThrow(/not found/i);
  });

  it('refuses the comments of a space memo to a user outside the space', async () => {
    await db.insert(memo).values(memoRow({ visibility: 'space', spaceId: testSpace.id }));

    const caller = createAuthenticatedCaller(db, outsider.id);

    await expect(caller.memos.listComments({ memoId: 'memo-1' })).rejects.toThrow(
      /not found/i,
    );
  });

  it('refuses a comment on a space memo from a user outside the space', async () => {
    await db.insert(memo).values(memoRow({ visibility: 'space', spaceId: testSpace.id }));

    const caller = createAuthenticatedCaller(db, outsider.id);

    await expect(
      caller.memos.create({ content: 'me too', parentId: 'memo-1' }),
    ).rejects.toThrow(/not found/i);
  });

  it('returns a public memo to a visitor who is not signed in', async () => {
    await db.insert(memo).values(memoRow({ visibility: 'public' }));

    const caller = createTestCaller(db);

    expect((await caller.memos.getById({ id: 'memo-1' })).id).toBe('memo-1');
    expect(await caller.memos.listComments({ memoId: 'memo-1' })).toEqual([]);
  });

  it('returns a private memo to its author and to nobody else', async () => {
    await db.insert(memo).values(memoRow({ visibility: 'private' }));

    const authorCaller = createAuthenticatedCaller(db, testUser.id);
    const outsiderCaller = createAuthenticatedCaller(db, outsider.id);

    expect((await authorCaller.memos.getById({ id: 'memo-1' })).id).toBe('memo-1');
    await expect(outsiderCaller.memos.getById({ id: 'memo-1' })).rejects.toThrow();
  });
});

describe('writing with the space audience', () => {
  beforeEach(async () => {
    await db.insert(user).values(testUser);
    await db.insert(space).values(testSpace);
    await db.insert(memo).values(memoRow({ id: 'existing-memo' }));
  });

  it('refuses to create a space-visible memo, which names no space', async () => {
    const caller = createAuthenticatedCaller(db, testUser.id);

    await expect(
      caller.memos.create({ content: 'for the club', visibility: 'space' }),
    ).rejects.toThrow(/cannot be written into a space/i);
  });

  it('refuses to make an existing memo space-visible', async () => {
    const caller = createAuthenticatedCaller(db, testUser.id);

    await expect(
      caller.memos.update({ id: 'existing-memo', content: 'for the club', visibility: 'space' }),
    ).rejects.toThrow(/cannot be written into a space/i);
  });

  it('leaves the memo untouched when the update is refused', async () => {
    const caller = createAuthenticatedCaller(db, testUser.id);

    await caller.memos
      .update({ id: 'existing-memo', content: 'for the club', visibility: 'space' })
      .catch(() => undefined);

    const [row] = await db.select().from(memo).where(eq(memo.id, 'existing-memo'));
    expect(row?.content).toBe('a memo');
    expect(row?.visibility).toBe('private');
  });
});
