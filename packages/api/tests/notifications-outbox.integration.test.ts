import { type DatabaseInstance, eq, memo, notification, outbox, user } from '@repo/db';
import { drainOnce } from '../src/server/events/outbox';
import { createEventBusWithHandlers } from '../src/server/events/register-handlers';
import { startTestDatabase, stopTestDatabase } from './helpers/db';
import { createFakeEmailSender } from './helpers/email';
import { createAuthenticatedCaller } from './helpers/trpc';

let db: DatabaseInstance;

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

beforeEach(async () => {
  await db.delete(notification);
  await db.delete(outbox);
  await db.delete(memo);
  await db.delete(user);
});

const author = {
  id: 'author-id',
  name: 'Memo Author',
  email: 'author@example.com',
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const commenter = {
  id: 'commenter-id',
  name: 'Commenter',
  email: 'commenter@example.com',
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const parentMemo = {
  id: 'parent-memo-id',
  userId: author.id,
  content: 'A public memo',
  visibility: 'public' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('comment.created producer (memos.create)', () => {
  beforeEach(async () => {
    await db.insert(user).values([author, commenter]);
    await db.insert(memo).values(parentMemo);
  });

  it('writes the comment and a pending outbox row in the same transaction, and no notification yet', async () => {
    const caller = createAuthenticatedCaller(db, commenter.id);

    const comment = await caller.memos.create({
      content: 'Nice memo!',
      parentId: parentMemo.id,
    });

    const comments = await db.select().from(memo).where(eq(memo.parentId, parentMemo.id));
    expect(comments).toHaveLength(1);
    expect(comments[0]!.id).toBe(comment.id);

    const outboxRows = await db.select().from(outbox);
    expect(outboxRows).toHaveLength(1);
    expect(outboxRows[0]!.status).toBe('pending');
    expect(outboxRows[0]!.eventType).toBe('comment.created');
    expect(outboxRows[0]!.payload).toEqual({
      commentId: comment.id,
      parentMemoId: parentMemo.id,
      authorId: commenter.id,
    });

    // The producer triggers nothing directly: notifications only appear after the drain.
    const notifications = await db.select().from(notification);
    expect(notifications).toHaveLength(0);
  });

  it('records the event even for a comment on one\'s own memo', async () => {
    const caller = createAuthenticatedCaller(db, author.id);

    await caller.memos.create({ content: 'replying to myself', parentId: parentMemo.id });

    const outboxRows = await db.select().from(outbox);
    expect(outboxRows).toHaveLength(1);
    expect(outboxRows[0]!.eventType).toBe('comment.created');
  });

  it('records no event for a root memo', async () => {
    const caller = createAuthenticatedCaller(db, commenter.id);

    await caller.memos.create({ content: 'a root memo' });

    const outboxRows = await db.select().from(outbox);
    expect(outboxRows).toHaveLength(0);
  });
});

describe('drainOnce consumer', () => {
  beforeEach(async () => {
    await db.insert(user).values([author, commenter]);
    await db.insert(memo).values(parentMemo);
  });

  it('turns a pending comment.created row into the correct notification and marks it processed', async () => {
    const caller = createAuthenticatedCaller(db, commenter.id);
    const comment = await caller.memos.create({ content: 'Nice!', parentId: parentMemo.id });

    const bus = createEventBusWithHandlers(db, createFakeEmailSender());
    await drainOnce({ db, bus });

    const notifications = await db.select().from(notification);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.senderId).toBe(commenter.id);
    expect(notifications[0]!.receiverId).toBe(author.id);
    expect(notifications[0]!.entityId).toBe(comment.id);
    expect(notifications[0]!.type).toBe('MEMO_COMMENT');

    const outboxRows = await db.select().from(outbox);
    expect(outboxRows[0]!.status).toBe('processed');
    expect(outboxRows[0]!.processedAt).not.toBeNull();
  });

  it('does not create a duplicate notification when the same event is drained again', async () => {
    const caller = createAuthenticatedCaller(db, commenter.id);
    await caller.memos.create({ content: 'Nice!', parentId: parentMemo.id });

    const bus = createEventBusWithHandlers(db, createFakeEmailSender());
    await drainOnce({ db, bus });

    // Force the row back to pending to genuinely re-dispatch the event (a crash/replay),
    // exercising the unique-constraint + insert-on-conflict idempotency in the handler.
    await db.update(outbox).set({ status: 'pending' });
    await drainOnce({ db, bus });

    const notifications = await db.select().from(notification);
    expect(notifications).toHaveLength(1);
  });

  it('produces no notification for a comment on one\'s own memo (policy in the handler)', async () => {
    const caller = createAuthenticatedCaller(db, author.id);
    await caller.memos.create({ content: 'replying to myself', parentId: parentMemo.id });

    const bus = createEventBusWithHandlers(db, createFakeEmailSender());
    await drainOnce({ db, bus });

    const notifications = await db.select().from(notification);
    expect(notifications).toHaveLength(0);

    // The event was still emitted and successfully handled (a no-op), so the row is processed.
    const outboxRows = await db.select().from(outbox);
    expect(outboxRows[0]!.status).toBe('processed');
  });
});
