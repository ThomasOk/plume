import { type DatabaseInstance, memo, notification, outbox, user } from '@repo/db';
import { COMMENT_CREATED } from '../src/server/events/domain-events';
import { createInProcessEventBus } from '../src/server/events/event-bus';
import { MAX_ATTEMPTS, drainOnce, recordEvent } from '../src/server/events/outbox';
import { createEventBusWithHandlers } from '../src/server/events/register-handlers';
import { startTestDatabase, stopTestDatabase } from './helpers/db';
import { createFakeEmailSender, type FakeEmailSender } from './helpers/email';
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

// A bus whose only handler throws, so every delivery attempt fails deterministically.
// The payload is irrelevant to the failure, so tests can record a synthetic event.
function createAlwaysFailingBus() {
  const bus = createInProcessEventBus();
  bus.on(COMMENT_CREATED, () => {
    throw new Error('handler boom');
  });
  return bus;
}

// Records a synthetic pending event whose `nextAttemptAt` is due now, so the very next
// drain picks it up without going through the tRPC producer.
async function recordDueEvent() {
  await recordEvent(db, {
    eventType: COMMENT_CREATED,
    payload: { commentId: 'c1', parentMemoId: parentMemo.id, authorId: commenter.id },
  });
}

// Forces a row's backoff window open again so a follow-up drain re-attempts it immediately,
// instead of waiting out the real (seconds-long) exponential delay in a test.
async function makeDueNow() {
  await db.update(outbox).set({ nextAttemptAt: new Date() });
}

describe('drainOnce backoff and dead-letter', () => {
  it('leaves a failed row pending, increments attempts, records the error, and pushes nextAttemptAt out', async () => {
    await recordDueEvent();
    const before = (await db.select().from(outbox))[0]!;

    await drainOnce({ db, bus: createAlwaysFailingBus() });

    const [row] = await db.select().from(outbox);
    expect(row!.status).toBe('pending');
    expect(row!.attempts).toBe(1);
    expect(row!.lastError).toContain('handler boom');
    expect(row!.processedAt).toBeNull();
    // The retry is scheduled into the future so the drain won't hammer the failing handler.
    expect(row!.nextAttemptAt.getTime()).toBeGreaterThan(before.nextAttemptAt.getTime());
  });

  it('does not retry a row before its nextAttemptAt has passed', async () => {
    await recordDueEvent();
    const bus = createAlwaysFailingBus();

    await drainOnce({ db, bus });
    // nextAttemptAt is now in the future; an immediate second drain must skip the row.
    await drainOnce({ db, bus });

    const [row] = await db.select().from(outbox);
    expect(row!.attempts).toBe(1);
  });

  it('dead-letters a row to status=failed after MAX_ATTEMPTS failures and stops retrying it', async () => {
    await recordDueEvent();
    const bus = createAlwaysFailingBus();

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await makeDueNow();
      await drainOnce({ db, bus });
    }

    const [row] = await db.select().from(outbox);
    expect(row!.status).toBe('failed');
    expect(row!.attempts).toBe(MAX_ATTEMPTS);
    expect(row!.lastError).toContain('handler boom');

    // A further drain leaves the dead-lettered row untouched — it is no longer pending.
    await makeDueNow();
    await drainOnce({ db, bus });
    const [again] = await db.select().from(outbox);
    expect(again!.attempts).toBe(MAX_ATTEMPTS);
    expect(again!.status).toBe('failed');
  });

  it('recovers: a handler that fails once then succeeds yields exactly one notification and one email', async () => {
    await db.insert(user).values([author, commenter]);
    await db.insert(memo).values(parentMemo);

    const caller = createAuthenticatedCaller(db, commenter.id);
    await caller.memos.create({ content: 'Nice!', parentId: parentMemo.id });

    // Real handlers, but the email port fails on its first call and succeeds after. The
    // persist handler already ran on the failed attempt, so the retry must not duplicate it.
    const emailSender = createFlakyEmailSender(1);
    const bus = createEventBusWithHandlers(db, emailSender);

    await drainOnce({ db, bus });
    let [row] = await db.select().from(outbox);
    expect(row!.status).toBe('pending');
    expect(row!.attempts).toBe(1);

    await makeDueNow();
    await drainOnce({ db, bus });

    [row] = await db.select().from(outbox);
    expect(row!.status).toBe('processed');

    const notifications = await db.select().from(notification);
    expect(notifications).toHaveLength(1);
    expect(emailSender.sent).toHaveLength(1);
  });
});

// An EmailSender that throws for its first `failTimes` sends, then delegates to a real fake.
// Models a flaky downstream that recovers, without touching the persistence handler.
function createFlakyEmailSender(failTimes: number): FakeEmailSender {
  const inner = createFakeEmailSender();
  let failures = 0;
  return {
    get sent() {
      return inner.sent;
    },
    async send(message) {
      if (failures < failTimes) {
        failures++;
        throw new Error('email provider unavailable');
      }
      await inner.send(message);
    },
  };
}
