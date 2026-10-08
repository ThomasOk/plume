import { type DatabaseInstance, attachment, memo, space, spaceMember, user } from '@repo/db';
import type { AppLogger } from '../src/server/trpc';
import { startTestDatabase, stopTestDatabase } from './helpers/db';
import { createFakeStorage } from './helpers/storage';
import { createAuthenticatedCaller } from './helpers/trpc';

// Deleting a memo removes its attachments from storage, not only their records, so a deleted
// memo leaves nothing reachable by its link — whoever deletes it.

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

const userRow = (id: string) => ({
  id,
  name: id,
  email: `${id}@example.com`,
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const alice = userRow('alice');
const bob = userRow('bob');

const memoRow = (id: string, overrides: Partial<typeof memo.$inferInsert> = {}) => ({
  id,
  userId: alice.id,
  content: id,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const attachmentOn = (memoId: string, storageKey: string, userId = alice.id) => ({
  id: `attachment-${storageKey}`,
  userId,
  memoId,
  status: 'active' as const,
  filename: 'photo.png',
  storageKey,
  mimeType: 'image/png',
  size: 1024,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('deleting a memo', () => {
  beforeEach(async () => {
    await db.insert(user).values([alice, bob]);
  });

  it('removes its attachments from storage', async () => {
    await db.insert(memo).values(memoRow('memo-1'));
    await db.insert(attachment).values([
      attachmentOn('memo-1', 'uploads/alice/one.png'),
      attachmentOn('memo-1', 'uploads/alice/two.png'),
    ]);
    const storage = createFakeStorage();

    await createAuthenticatedCaller(db, alice.id, { storage }).memos.delete({ id: 'memo-1' });

    expect(storage.deletedKeys.sort()).toEqual(['uploads/alice/one.png', 'uploads/alice/two.png']);
  });

  it('removes its comments\' attachments from storage', async () => {
    await db.insert(memo).values(memoRow('memo-1', { visibility: 'public' }));
    await db.insert(memo).values(memoRow('comment-1', { userId: bob.id, parentId: 'memo-1', visibility: 'public' }));
    await db.insert(attachment).values([
      attachmentOn('memo-1', 'uploads/alice/memo.png'),
      attachmentOn('comment-1', 'uploads/bob/comment.png', bob.id),
    ]);
    const storage = createFakeStorage();

    await createAuthenticatedCaller(db, alice.id, { storage }).memos.delete({ id: 'memo-1' });

    expect(storage.deletedKeys.sort()).toEqual(['uploads/alice/memo.png', 'uploads/bob/comment.png']);
  });

  it('removes the attachments of a member\'s memo deleted by an admin of its space', async () => {
    await db.insert(space).values({ id: 'club', title: 'Club', createdAt: new Date(), updatedAt: new Date() });
    await db.insert(spaceMember).values([
      { spaceId: 'club', userId: alice.id, role: 'admin', joinedAt: new Date() },
      { spaceId: 'club', userId: bob.id, role: 'member', joinedAt: new Date() },
    ]);
    await db.insert(memo).values(memoRow('memo-1', { userId: bob.id, visibility: 'space', spaceId: 'club' }));
    await db.insert(attachment).values(attachmentOn('memo-1', 'uploads/bob/photo.png', bob.id));
    const storage = createFakeStorage();

    await createAuthenticatedCaller(db, alice.id, { storage }).memos.delete({ id: 'memo-1' });

    expect(storage.deletedKeys).toEqual(['uploads/bob/photo.png']);
  });

  it('removes nothing from storage when the memo has no attachment', async () => {
    await db.insert(memo).values(memoRow('memo-1'));
    const storage = createFakeStorage();

    await createAuthenticatedCaller(db, alice.id, { storage }).memos.delete({ id: 'memo-1' });

    expect(storage.deletedKeys).toEqual([]);
    expect(await db.select().from(memo)).toEqual([]);
  });

  // The memo is the source of truth: an attachment left in storage is a smaller harm than a
  // memo that cannot be deleted while storage is down.
  it('succeeds, and logs the failure, when storage fails to remove an attachment', async () => {
    await db.insert(memo).values(memoRow('memo-1'));
    await db.insert(attachment).values(attachmentOn('memo-1', 'uploads/alice/photo.png'));
    const storage = createFakeStorage({ failingKeys: ['uploads/alice/photo.png'] });
    const logged: object[] = [];
    const logger: AppLogger = {
      info: () => {},
      debug: () => {},
      error: (obj) => void logged.push(obj as object),
    };

    await expect(
      createAuthenticatedCaller(db, alice.id, { storage, logger }).memos.delete({ id: 'memo-1' }),
    ).resolves.toEqual({ success: true });

    expect(await db.select().from(memo)).toEqual([]);
    expect(logged).toEqual([expect.objectContaining({ memoId: 'memo-1', storageKey: 'uploads/alice/photo.png' })]);
  });

  it('still removes the other attachments when one of them fails', async () => {
    await db.insert(memo).values(memoRow('memo-1'));
    await db.insert(attachment).values([
      attachmentOn('memo-1', 'uploads/alice/one.png'),
      attachmentOn('memo-1', 'uploads/alice/two.png'),
      attachmentOn('memo-1', 'uploads/alice/three.png'),
    ]);
    const storage = createFakeStorage({ failingKeys: ['uploads/alice/one.png'] });

    await createAuthenticatedCaller(db, alice.id, { storage }).memos.delete({ id: 'memo-1' });

    expect(storage.deletedKeys.sort()).toEqual(['uploads/alice/three.png', 'uploads/alice/two.png']);
  });
});
