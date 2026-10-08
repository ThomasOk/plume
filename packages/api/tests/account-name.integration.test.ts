import { type AuthInstance, createAuth } from '@repo/auth/server';
import { type DatabaseInstance, user } from '@repo/db';
import { startTestDatabase, stopTestDatabase } from './helpers/db';

// The Better Auth instance itself, on the test database, driven through its server API —
// what the settings page's `updateUser` call reaches. Better Auth enforces nothing on a
// name; the rule lives in the auth configuration, and this proves it holds there.

let db: DatabaseInstance;
let auth: AuthInstance;

beforeAll(async () => {
  db = await startTestDatabase();
  auth = createAuth({
    baseURL: 'http://localhost:3035',
    trustedOrigins: ['http://localhost:5173'],
    authSecret: 'test-auth-secret-at-least-32-characters-long',
    db,
  });
});

afterAll(async () => {
  await stopTestDatabase();
});

beforeEach(async () => {
  await db.delete(user);
});

const signUp = async () => {
  const { headers } = await auth.api.signUpEmail({
    body: {
      name: 'Ada',
      email: 'ada@example.com',
      password: 'correct-horse-battery',
    },
    returnHeaders: true,
  });
  return new Headers({ cookie: headers.get('set-cookie') ?? '' });
};

const rename = (headers: Headers, name: string) =>
  auth.api.updateUser({ body: { name }, headers });

const nameOf = async (headers: Headers) =>
  (await auth.api.getSession({ headers, query: { disableCookieCache: true } }))
    ?.user.name;

describe('a user changing their name', () => {
  it('the new name is what the session reads', async () => {
    const headers = await signUp();

    await rename(headers, 'Ada Lovelace');

    expect(await nameOf(headers)).toBe('Ada Lovelace');
  });

  it('a name with surrounding spaces is stored trimmed', async () => {
    const headers = await signUp();

    await rename(headers, '  Ada Lovelace  ');

    expect(await nameOf(headers)).toBe('Ada Lovelace');
  });

  it.each([
    ['an empty name', '', 'Name is required'],
    ['a whitespace-only name', '   ', 'Name is required'],
    [
      'a name over 100 characters',
      'a'.repeat(101),
      'Name must be at most 100 characters',
    ],
  ])(
    '%s is refused with a clear message, and the name is unchanged',
    async (_, name, message) => {
      const headers = await signUp();

      await expect(rename(headers, name)).rejects.toThrow(message);

      expect(await nameOf(headers)).toBe('Ada');
    },
  );

  it('a name of exactly 100 characters is accepted', async () => {
    const headers = await signUp();

    await rename(headers, 'a'.repeat(100));

    expect(await nameOf(headers)).toBe('a'.repeat(100));
  });
});
