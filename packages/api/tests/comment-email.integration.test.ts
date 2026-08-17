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

describe('sendCommentEmail handler (via drainOnce)', () => {
  beforeEach(async () => {
    await db.insert(user).values([author, commenter]);
    await db.insert(memo).values(parentMemo);
  });

  it('sends exactly one email to the parent memo author after drain', async () => {
    const caller = createAuthenticatedCaller(db, commenter.id);
    await caller.memos.create({ content: 'Nice memo!', parentId: parentMemo.id });

    const emailSender = createFakeEmailSender();
    const bus = createEventBusWithHandlers(db, emailSender);
    await drainOnce({ db, bus });

    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]!.to).toBe(author.email);

    // The idempotency key is the outbox row id — the property that makes a replay safe.
    const [row] = await db.select().from(outbox);
    expect(emailSender.sent[0]!.idempotencyKey).toBe(row!.id);
  });

  it('sends still exactly one email when the same event is re-drained (idempotency key = outbox id)', async () => {
    const caller = createAuthenticatedCaller(db, commenter.id);
    await caller.memos.create({ content: 'Nice memo!', parentId: parentMemo.id });

    const emailSender = createFakeEmailSender();
    const bus = createEventBusWithHandlers(db, emailSender);
    await drainOnce({ db, bus });

    // Force the row back to pending to genuinely re-dispatch the event (a crash/replay),
    // so the handler calls `send` again with the same key. The provider dedupes on the key.
    await db.update(outbox).set({ status: 'pending' });
    await drainOnce({ db, bus });

    expect(emailSender.sent).toHaveLength(1);
  });

  it('sends no email for a comment on one\'s own memo (same self-comment policy)', async () => {
    const caller = createAuthenticatedCaller(db, author.id);
    await caller.memos.create({ content: 'replying to myself', parentId: parentMemo.id });

    const emailSender = createFakeEmailSender();
    const bus = createEventBusWithHandlers(db, emailSender);
    await drainOnce({ db, bus });

    expect(emailSender.sent).toHaveLength(0);

    // The event was still emitted and handled (a no-op for both reactions), so it's processed.
    const [row] = await db.select().from(outbox);
    expect(row!.status).toBe('processed');
  });

  it('records both the notification and the email from one comment.created event', async () => {
    const caller = createAuthenticatedCaller(db, commenter.id);
    const comment = await caller.memos.create({ content: 'Nice!', parentId: parentMemo.id });

    const emailSender = createFakeEmailSender();
    const bus = createEventBusWithHandlers(db, emailSender);
    await drainOnce({ db, bus });

    const notifications = await db.select().from(notification).where(eq(notification.entityId, comment.id));
    expect(notifications).toHaveLength(1);
    expect(emailSender.sent).toHaveLength(1);
  });
});
