import { type DatabaseInstance, memo, user } from '@repo/db';
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

// What crosses the wire: a client sees the code and the message, nothing else.
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

describe('the errors a caller receives', () => {
  beforeEach(async () => {
    await db.insert(user).values([userRow('author'), userRow('other')]);
  });

  it('reports a missing memo as not found', async () => {
    const caller = createAuthenticatedCaller(db, 'author');

    expect(await refusal(caller.memos.getById({ id: 'no-such-memo' }))).toEqual({
      code: 'NOT_FOUND',
      message: 'Memo not found',
    });
  });

  it('reports an action on another user memo as forbidden', async () => {
    // Public, so that it is readable: a memo the caller cannot read answers as not found.
    await db.insert(memo).values({
      id: 'memo-1',
      userId: 'author',
      content: 'a memo',
      visibility: 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = createAuthenticatedCaller(db, 'other');

    expect((await refusal(caller.memos.delete({ id: 'memo-1' }))).code).toBe('FORBIDDEN');
  });

  it('hides the detail of an unexpected error', async () => {
    // A session whose user row does not exist: the insert fails on a foreign key, and the
    // database's message names tables and constraints a client has no business seeing.
    const caller = createAuthenticatedCaller(db, 'no-such-user');

    expect(await refusal(caller.memos.create({ content: 'hello' }))).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  });
});
