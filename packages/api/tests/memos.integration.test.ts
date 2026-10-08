import { type DatabaseInstance, memo, user } from '@repo/db';
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

describe('memos.create', () => {
  beforeEach(async () => {
    await db.insert(user).values(testUser);
  });

  it('creates a memo for an authenticated user', async () => {
    const authenticatedCaller = createAuthenticatedCaller(db);
    const result = await authenticatedCaller.memos.create({
      content: 'Hello world',
    });

    expect(result.content).toBe('Hello world');
    expect(result.userId).toBe('test-user-id');
    expect(result.id).toBeDefined();
  });

  it('automatically extracts tags from content', async () => {
    const authenticatedCaller = createAuthenticatedCaller(db);
    const result = await authenticatedCaller.memos.create({
      content: 'New receipe #cooking',
    });

    expect(result.tags).toEqual(['cooking']);
  });

  it('throws when unauthenticated', async () => {
    const unAuthenticatedCaller = createTestCaller(db);

    await expect(
      unAuthenticatedCaller.memos.create({ content: '...' }),
    ).rejects.toThrow();
  });
});

describe('memos.list', () => {
  beforeEach(async () => {
    await db.insert(user).values(testUser);
  });

  it('returns the user memos', async () => {
    await db.insert(memo).values({
      id: 'memo-1',
      userId: 'test-user-id',
      content: 'First memo',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(memo).values({
      id: 'memo-2',
      userId: 'test-user-id',
      content: 'Second memo',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = createAuthenticatedCaller(db);
    const result = await caller.memos.list({});

    expect(result).toHaveLength(2);
  });
  it('does not return another user memos', async () => {
    await db.insert(memo).values({
      id: 'memo-1',
      userId: 'test-user-id',
      content: 'First memo',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const otherUser = {
      id: 'other-user-id',
      name: 'Other User',
      email: 'otheruser@example.com',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(user).values(otherUser);
    await db.insert(memo).values({
      id: 'memo-2',
      userId: 'other-user-id',
      content: 'Other memo',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = createAuthenticatedCaller(db);
    const result = await caller.memos.list({});

    expect(result).toHaveLength(1);
    expect(result[0]!.userId).toBe('test-user-id');
  });

  it('filters by tag', async () => {
    await db.insert(memo).values({
      id: 'memo-1',
      userId: 'test-user-id',
      content: 'memo with no tag',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(memo).values({
      id: 'memo-2',
      userId: 'test-user-id',
      content: 'memo with cooking tag',
      tags: ['cooking'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = createAuthenticatedCaller(db);
    const result = await caller.memos.list({ tag: 'cooking' });

    expect(result).toHaveLength(1);
    expect(result[0]!.tags).toContain('cooking');
  });

  it('filters by date', async () => {
    await db.insert(memo).values({
      id: 'memo-1',
      userId: 'test-user-id',
      content: 'first memo',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date(),
    });
    await db.insert(memo).values({
      id: 'memo-2',
      userId: 'test-user-id',
      content: 'second memo',
      createdAt: new Date('2024-06-15'),
      updatedAt: new Date(),
    });

    const caller = createAuthenticatedCaller(db);
    const result = await caller.memos.list({ date: '2024-06-15' });

    expect(result).toHaveLength(1);
    expect(result[0]!.createdAt).toEqual(new Date('2024-06-15'));
  });

  it('filters by query', async () => {
    await db.insert(memo).values({
      id: 'memo-1',
      userId: 'test-user-id',
      content: 'first memo',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date(),
    });
    await db.insert(memo).values({
      id: 'memo-2',
      userId: 'test-user-id',
      content: 'second memo',
      createdAt: new Date('2024-06-15'),
      updatedAt: new Date(),
    });

    const caller = createAuthenticatedCaller(db);
    const result = await caller.memos.list({ query: 'first' });

    expect(result).toHaveLength(1);
    expect(result[0]!.content).toContain('first');
  });
});

describe('memos.update', () => {
  beforeEach(async () => {
    await db.insert(user).values(testUser);
  });

  it('updates the content and tags', async () => {
    await db.insert(memo).values({
      id: 'memo-1',
      userId: 'test-user-id',
      content: 'original content',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = createAuthenticatedCaller(db);
    const result = await caller.memos.update({
      id: 'memo-1',
      content: 'updated content #typescript',
    });

    expect(result.content).toBe('updated content #typescript');
    expect(result.tags).toEqual(['typescript']);
  });

  it('throws when updating another user memo', async () => {
    const otherUser = {
      id: 'other-user-id',
      name: 'Other User',
      email: 'other@example.com',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(user).values(otherUser);
    await db.insert(memo).values({
      id: 'memo-1',
      userId: 'other-user-id',
      content: 'other user memo',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = createAuthenticatedCaller(db);
    await expect(
      caller.memos.update({ id: 'memo-1', content: 'hacked' }),
    ).rejects.toThrow();
  });
});

// A comment has no audience of its own: it takes its memo's, and an edit of the memo's
// visibility carries its comments along (ADR 0001), as a move does.
describe('a comment, when its memo is edited', () => {
  beforeEach(async () => {
    await db.insert(user).values(testUser);
  });

  const visibilityOfComments = async (memoId: string) =>
    (await createAuthenticatedCaller(db).memos.listComments({ memoId })).map((c) => c.visibility);

  it('becomes public with a memo made public', async () => {
    const caller = createAuthenticatedCaller(db);
    const { id: memoId } = await caller.memos.create({ content: 'Draft', visibility: 'private' });
    await caller.memos.create({ content: 'A thought', parentId: memoId });

    await caller.memos.update({ id: memoId, content: 'Draft', visibility: 'public' });

    expect(await visibilityOfComments(memoId)).toEqual(['public']);
  });

  it('is out of a visitor’s reach once its memo is made private', async () => {
    const caller = createAuthenticatedCaller(db);
    const { id: memoId } = await caller.memos.create({ content: 'Announcement', visibility: 'public' });
    const { id: commentId } = await caller.memos.create({ content: 'A thought', parentId: memoId });

    await caller.memos.update({ id: memoId, content: 'Announcement', visibility: 'private' });

    expect(await visibilityOfComments(memoId)).toEqual(['private']);
    await expect(createTestCaller(db).memos.getById({ id: commentId })).rejects.toThrow('Memo not found');
  });

  it('keeps its memo’s visibility when it is edited itself', async () => {
    const caller = createAuthenticatedCaller(db);
    const { id: memoId } = await caller.memos.create({ content: 'Announcement', visibility: 'public' });
    const { id: commentId } = await caller.memos.create({ content: 'A thought', parentId: memoId });

    await caller.memos.update({ id: commentId, content: 'A better thought', visibility: 'private' });

    expect(await visibilityOfComments(memoId)).toEqual(['public']);
  });
});

describe('memos.delete', () => {
  beforeEach(async () => {
    await db.insert(user).values(testUser);
  });

  it('deletes the user memo', async () => {
    await db.insert(memo).values({
      id: 'memo-1',
      userId: 'test-user-id',
      content: 'memo to delete',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = createAuthenticatedCaller(db);
    await caller.memos.delete({ id: 'memo-1' });

    const remaining = await db.select().from(memo);
    expect(remaining).toHaveLength(0);
  });

  it('throws when deleting another user memo', async () => {
    const otherUser = {
      id: 'other-user-id',
      name: 'Other User',
      email: 'other@example.com',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(user).values(otherUser);
    await db.insert(memo).values({
      id: 'memo-1',
      userId: 'other-user-id',
      content: 'other user memo',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = createAuthenticatedCaller(db);
    await expect(caller.memos.delete({ id: 'memo-1' })).rejects.toThrow();
  });
});
