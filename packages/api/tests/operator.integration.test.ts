import {
  grantOperator,
  revokeOperator,
  UnknownUserError,
} from '@repo/auth/operator';
import { type AuthInstance, createAuth } from '@repo/auth/server';
import { type DatabaseInstance, user } from '@repo/db';
import { startTestDatabase, stopTestDatabase } from './helpers/db';

// The Better Auth instance itself, on the test database, driven through its server API —
// what the HTTP routes call. The tRPC tests forge their sessions; this proves the session
// tells the truth about the operator role.

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

// Signs up through Better Auth, sending whatever extra fields the body carries, and returns
// the new user's identifier with the headers that carry their session.
const signUp = async (body: Record<string, unknown> = {}) => {
  const { headers, response } = await auth.api.signUpEmail({
    body: {
      name: 'Ada',
      email: 'ada@example.com',
      password: 'correct-horse-battery',
      ...body,
    },
    returnHeaders: true,
  });
  const cookie = headers.get('set-cookie') ?? '';
  return { userId: response.user.id, headers: new Headers({ cookie }) };
};

// The session as the server reads it, past the five-minute cookie cache: a grant or a
// revocation is meant to wait for that cache to expire (ADR 0007).
const sessionOf = (headers: Headers) =>
  auth.api.getSession({ headers, query: { disableCookieCache: true } });

describe('becoming an operator', () => {
  it('a sign-up that claims to be an operator creates a user who is not an operator', async () => {
    const { headers } = await signUp({ isOperator: true });

    const session = await sessionOf(headers);

    expect(session?.user.isOperator).toBe(false);
  });

  it("after the grant, the user's session says they are an operator", async () => {
    const { userId, headers } = await signUp();

    await grantOperator(db, userId);

    expect((await sessionOf(headers))?.user.isOperator).toBe(true);
  });

  it("after the revocation, the user's session says they are not", async () => {
    const { userId, headers } = await signUp();
    await grantOperator(db, userId);

    await revokeOperator(db, userId);

    expect((await sessionOf(headers))?.user.isOperator).toBe(false);
  });

  it('granting twice changes nothing', async () => {
    const { userId, headers } = await signUp();
    await grantOperator(db, userId);
    const once = await sessionOf(headers);

    await grantOperator(db, userId);

    expect((await sessionOf(headers))?.user).toEqual(once?.user);
  });

  it('the grant and the revocation name the user they change', async () => {
    const { userId } = await signUp();

    expect(await grantOperator(db, userId)).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
    });
    expect(await revokeOperator(db, userId)).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
    });
  });

  it('granting or revoking an unknown identifier fails, naming the identifier', async () => {
    await expect(grantOperator(db, 'no-such-user')).rejects.toThrow(
      UnknownUserError,
    );
    await expect(grantOperator(db, 'no-such-user')).rejects.toThrow(
      '"no-such-user"',
    );
    await expect(revokeOperator(db, 'no-such-user')).rejects.toThrow(
      UnknownUserError,
    );
  });
});
