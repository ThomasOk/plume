import { type DatabaseInstance, eq, memo, notification, outbox, user } from '@repo/db';
import { createEventBusWithHandlers } from '../src/server/events/register-handlers';
import { startOutboxWorker } from '../src/server/events/worker';
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

// Polls the DB until `check` returns a value, or fails after `timeoutMs`. Lets the test wait
// on the worker's own timer instead of racing a fixed sleep against the poll interval.
async function waitFor<T>(
  check: () => Promise<T | undefined | null | false>,
  { timeoutMs = 2000, stepMs = 20 }: { timeoutMs?: number; stepMs?: number } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await check();
    if (result) return result;
    if (Date.now() > deadline) throw new Error('waitFor timed out');
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
}

describe('startOutboxWorker (booted, real DB)', () => {
  beforeEach(async () => {
    await db.insert(user).values([author, commenter]);
    await db.insert(memo).values(parentMemo);
  });

  it('drains a new comment into a notification within a poll interval, with no manual drain', async () => {
    const bus = createEventBusWithHandlers(db, createFakeEmailSender());
    const worker = startOutboxWorker({ db, bus, intervalMs: 20 });

    try {
      const caller = createAuthenticatedCaller(db, commenter.id);
      const comment = await caller.memos.create({
        content: 'Nice memo!',
        parentId: parentMemo.id,
      });

      // The worker — not the test — drains the row. Wait on the terminal `processed` state,
      // which the drain sets only after every handler has resolved, so the notification below
      // is guaranteed present rather than racing the in-flight drain.
      await waitFor(async () => {
        const rows = await db.select().from(outbox);
        return rows[0]?.status === 'processed';
      });

      const notifications = await db
        .select()
        .from(notification)
        .where(eq(notification.entityId, comment.id));
      expect(notifications).toHaveLength(1);
      expect(notifications[0]!.receiverId).toBe(author.id);
      expect(notifications[0]!.senderId).toBe(commenter.id);
    } finally {
      await worker.stop();
    }
  });
});
