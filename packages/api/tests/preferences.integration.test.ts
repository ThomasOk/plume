import { type DatabaseInstance, user } from '@repo/db';
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
  await db.delete(user);
  await db.insert(user).values({
    id: 'ada-id',
    name: 'Ada',
    email: 'ada@example.com',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

describe('a user\'s preferences', () => {
  it('are the defaults for a user who never changed them', async () => {
    const caller = createAuthenticatedCaller(db, 'ada-id');

    expect(await caller.preferences.get()).toEqual({ commentEmails: true });
  });

  it('read back what the user last set', async () => {
    const caller = createAuthenticatedCaller(db, 'ada-id');

    await caller.preferences.update({ commentEmails: false });
    expect(await caller.preferences.get()).toEqual({ commentEmails: false });

    // A second update finds the row the first one wrote.
    await caller.preferences.update({ commentEmails: true });
    expect(await caller.preferences.get()).toEqual({ commentEmails: true });
  });
});
