import { type DatabaseInstance, attachment, memo, space, user } from '@repo/db';
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
  await db.delete(attachment);
  await db.delete(memo);
  await db.delete(space);
  await db.delete(user);
});

const author = {
  id: 'author-id',
  name: 'Author',
  email: 'author@example.com',
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const outsider = { ...author, id: 'outsider-id', name: 'Outsider', email: 'outsider@example.com' };

const testSpace = {
  id: 'space-1',
  title: 'Cooking club',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const memoRow = (overrides: Partial<typeof memo.$inferInsert>) => ({
  id: 'memo-1',
  userId: author.id,
  content: 'a memo',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const attachmentOn = (memoId: string) => ({
  id: `attachment-of-${memoId}`,
  userId: author.id,
  memoId,
  status: 'active' as const,
  filename: 'recipe.pdf',
  storageKey: `uploads/${author.id}/recipe.pdf`,
  mimeType: 'application/pdf',
  size: 1024,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('attachments.listByMemo', () => {
  beforeEach(async () => {
    await db.insert(user).values([author, outsider]);
    await db.insert(space).values(testSpace);
  });

  it('refuses the attachments of a space memo to a user outside the space, as if the memo did not exist', async () => {
    await db.insert(memo).values(
      memoRow({ visibility: 'space', spaceId: testSpace.id }),
    );
    await db.insert(attachment).values(attachmentOn('memo-1'));

    const caller = createAuthenticatedCaller(db, outsider.id);

    await expect(caller.attachments.listByMemo({ memoId: 'memo-1' })).rejects.toThrow(
      /not found/i,
    );
  });

  it('refuses the attachments of a space memo to a visitor who is not signed in', async () => {
    await db.insert(memo).values(memoRow({ visibility: 'space', spaceId: testSpace.id }));
    await db.insert(attachment).values(attachmentOn('memo-1'));

    const caller = createTestCaller(db);

    await expect(caller.attachments.listByMemo({ memoId: 'memo-1' })).rejects.toThrow();
  });

  it('returns the attachments of a public memo to a visitor who is not signed in', async () => {
    await db.insert(memo).values(memoRow({ visibility: 'public' }));
    await db.insert(attachment).values(attachmentOn('memo-1'));

    const caller = createTestCaller(db);
    const result = await caller.attachments.listByMemo({ memoId: 'memo-1' });

    expect(result.map((a) => a.filename)).toEqual(['recipe.pdf']);
  });

  it('returns the attachments of a private memo to its author', async () => {
    await db.insert(memo).values(memoRow({ visibility: 'private' }));
    await db.insert(attachment).values(attachmentOn('memo-1'));

    const caller = createAuthenticatedCaller(db, author.id);
    const result = await caller.attachments.listByMemo({ memoId: 'memo-1' });

    expect(result.map((a) => a.filename)).toEqual(['recipe.pdf']);
  });

  it('refuses the attachments of a private memo to anyone else', async () => {
    await db.insert(memo).values(memoRow({ visibility: 'private' }));
    await db.insert(attachment).values(attachmentOn('memo-1'));

    const caller = createAuthenticatedCaller(db, outsider.id);

    await expect(caller.attachments.listByMemo({ memoId: 'memo-1' })).rejects.toThrow();
  });

  it('reports an unknown memo as not found', async () => {
    const caller = createAuthenticatedCaller(db, author.id);

    await expect(
      caller.attachments.listByMemo({ memoId: 'no-such-memo' }),
    ).rejects.toThrow(/not found/i);
  });
});
