import { hashPassword } from '@repo/auth/credential';
import {
  type DatabaseInstance,
  account,
  attachment,
  eq,
  FORMER_USER_ID,
  memo,
  session,
  space,
  spaceMember,
  user,
} from '@repo/db';
import { TRPCError } from '@trpc/server';
import { getErrorShape } from '@trpc/server/unstable-core-do-not-import';
import { appRouter } from '../src/server';
import { startTestDatabase, stopTestDatabase } from './helpers/db';
import { createFakeStorage } from './helpers/storage';
import { createAuthenticatedCaller } from './helpers/trpc';

// A user deletes their account: their personal memos go with it, and what they wrote for
// others — memos in a space, comments under someone else's memo — passes to the Former user.

let db: DatabaseInstance;

// Hashed once: Better Auth's scrypt is slow on purpose.
const PASSWORD = 'correct-horse-battery';
let passwordHash: string;

beforeAll(async () => {
  db = await startTestDatabase();
  passwordHash = await hashPassword(PASSWORD);
});

afterAll(async () => {
  await stopTestDatabase();
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
const carol = userRow('carol');

const credentialOf = (userId: string) => ({
  id: `credential-${userId}`,
  accountId: userId,
  providerId: 'credential',
  userId,
  password: passwordHash,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const googleAccountOf = (userId: string) => ({
  id: `google-${userId}`,
  accountId: `google-${userId}`,
  providerId: 'google',
  userId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const memoRow = (id: string, overrides: Partial<typeof memo.$inferInsert> = {}) => ({
  id,
  userId: alice.id,
  content: id,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const spaceRow = (id: string, title: string) => ({ id, title, createdAt: new Date(), updatedAt: new Date() });

const inSpace = (spaceId: string) => ({ visibility: 'space' as const, spaceId });

const attachmentOn = (memoId: string | null, storageKey: string, userId = alice.id) => ({
  id: `attachment-${storageKey}`,
  userId,
  memoId,
  status: memoId ? ('active' as const) : ('pending' as const),
  filename: 'photo.png',
  storageKey,
  mimeType: 'image/png',
  size: 1024,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// The error a client receives: its code, its message, and the spaces a last-admin refusal
// names. Shaped by the router's error formatter, as the HTTP adapter does, since the spaces
// travel in the error's data rather than in its message.
const refusal = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => {
      throw new Error('expected the call to be refused');
    },
    (e: unknown) => e,
  );
  if (!(error instanceof TRPCError)) throw error;
  const shape = getErrorShape({
    config: appRouter._def._config,
    error,
    type: 'mutation',
    path: 'account.delete',
    input: undefined,
    ctx: undefined,
  });
  return { code: shape.data.code, message: shape.message, spaces: shape.data.spaces };
};

// Everything a refused deletion must have left as it was.
const snapshot = async () => ({
  users: (await db.select({ id: user.id }).from(user)).map(({ id }) => id).sort(),
  memos: await db.select().from(memo).orderBy(memo.id),
  attachments: await db.select().from(attachment).orderBy(attachment.id),
  spaces: await db.select().from(space).orderBy(space.id),
  members: await db.select().from(spaceMember).orderBy(spaceMember.spaceId, spaceMember.userId),
});

const MINUTE = 60 * 1000;

const as = (u: { id: string }, options: Parameters<typeof createAuthenticatedCaller>[2] = {}) =>
  createAuthenticatedCaller(db, u.id, options);

// Alice signs in with a password; Bob and Carol are other users.
const deleteAlice = (options: Parameters<typeof createAuthenticatedCaller>[2] = {}) =>
  as(alice, options).account.delete({ email: alice.email, password: PASSWORD });

const authorOf = async (id: string) => {
  const [row] = await db.select({ userId: memo.userId }).from(memo).where(eq(memo.id, id));
  return row?.userId;
};

const memoIds = async () => (await db.select({ id: memo.id }).from(memo)).map(({ id }) => id).sort();

beforeEach(async () => {
  await db.delete(attachment);
  await db.delete(memo);
  await db.delete(space);
  await db.delete(user).where(eq(user.id, alice.id));
  await db.delete(user).where(eq(user.id, bob.id));
  await db.delete(user).where(eq(user.id, carol.id));
  await db.insert(user).values([alice, bob, carol]);
  await db.insert(account).values(credentialOf(alice.id));
});

describe('deleting an account', () => {
  it('deletes the user\'s personal memos, private and public, with every comment under them', async () => {
    await db.insert(memo).values([
      memoRow('private-memo'),
      memoRow('public-memo', { visibility: 'public' }),
      memoRow('bobs-memo', { userId: bob.id }),
    ]);
    await db.insert(memo).values([
      memoRow('bobs-comment', { userId: bob.id, parentId: 'public-memo', visibility: 'public' }),
      memoRow('alices-own-comment', { parentId: 'public-memo', visibility: 'public' }),
    ]);

    await deleteAlice();

    expect(await memoIds()).toEqual(['bobs-memo']);
    expect(await db.select().from(user).where(eq(user.id, alice.id))).toEqual([]);
  });

  it('passes the user\'s memos in a space to the Former user, still listed in the space', async () => {
    await db.insert(space).values(spaceRow('club', 'Cooking club'));
    await db.insert(spaceMember).values([
      { spaceId: 'club', userId: alice.id, role: 'member', joinedAt: new Date() },
      { spaceId: 'club', userId: bob.id, role: 'admin', joinedAt: new Date() },
    ]);
    await db.insert(memo).values(memoRow('space-memo', inSpace('club')));
    await db.insert(memo).values(memoRow('alices-comment-on-her-space-memo', { parentId: 'space-memo', ...inSpace('club') }));

    await deleteAlice();

    expect(await authorOf('space-memo')).toBe(FORMER_USER_ID);
    expect(await authorOf('alices-comment-on-her-space-memo')).toBe(FORMER_USER_ID);
    const listed = await as(bob).memos.space.list({ spaceId: 'club' });
    expect(listed.map(({ id, author }) => ({ id, author: author.name }))).toEqual([
      { id: 'space-memo', author: 'Deleted user' },
    ]);
  });

  it('takes the user\'s reactions with it, everywhere, passing none to the Former user', async () => {
    await db.insert(space).values(spaceRow('club', 'Cooking club'));
    await db.insert(spaceMember).values([
      { spaceId: 'club', userId: alice.id, role: 'member', joinedAt: new Date() },
      { spaceId: 'club', userId: bob.id, role: 'admin', joinedAt: new Date() },
    ]);
    await db.insert(memo).values([
      memoRow('bobs-public-memo', { userId: bob.id, visibility: 'public' }),
      memoRow('bobs-space-memo', { userId: bob.id, ...inSpace('club') }),
      memoRow('alices-space-memo', inSpace('club')),
    ]);
    await as(alice).memos.react({ memoId: 'bobs-public-memo', emoji: '👍' });
    await as(carol).memos.react({ memoId: 'bobs-public-memo', emoji: '👍' });
    await as(alice).memos.react({ memoId: 'bobs-space-memo', emoji: '❤️' });
    await as(alice).memos.react({ memoId: 'alices-space-memo', emoji: '🎉' });
    await as(bob).memos.react({ memoId: 'alices-space-memo', emoji: '🙏' });

    await deleteAlice();

    const reactionsOn = async (id: string) =>
      (await as(bob).memos.getById({ id })).reactions.map(({ emoji, reactors }) => ({ emoji, reactors: reactors.map(({ id }) => id) }));
    expect(await reactionsOn('bobs-public-memo')).toEqual([{ emoji: '👍', reactors: [carol.id] }]);
    expect(await reactionsOn('bobs-space-memo')).toEqual([]);
    // The memo she wrote outlives her; the reaction she left on it does not.
    expect(await reactionsOn('alices-space-memo')).toEqual([{ emoji: '🙏', reactors: [bob.id] }]);
  });

  it('passes the user\'s comment under another author\'s memo to the Former user', async () => {
    await db.insert(memo).values(memoRow('bobs-memo', { userId: bob.id, visibility: 'public' }));
    await db.insert(memo).values(memoRow('alices-comment', { parentId: 'bobs-memo', visibility: 'public' }));

    await deleteAlice();

    expect(await authorOf('alices-comment')).toBe(FORMER_USER_ID);
    const comments = await as(bob).memos.listComments({ memoId: 'bobs-memo' });
    expect(comments.map(({ id, author }) => ({ id, author: author.name }))).toEqual([
      { id: 'alices-comment', author: 'Deleted user' },
    ]);
  });

  it('keeps the attachments of a memo and a comment passed to the Former user attached to them', async () => {
    await db.insert(space).values(spaceRow('club', 'Cooking club'));
    await db.insert(spaceMember).values([
      { spaceId: 'club', userId: alice.id, role: 'member', joinedAt: new Date() },
      { spaceId: 'club', userId: bob.id, role: 'admin', joinedAt: new Date() },
    ]);
    await db.insert(memo).values([
      memoRow('space-memo', inSpace('club')),
      memoRow('bobs-memo', { userId: bob.id, visibility: 'public' }),
    ]);
    await db.insert(memo).values(memoRow('alices-comment', { parentId: 'bobs-memo', visibility: 'public' }));
    await db.insert(attachment).values([
      attachmentOn('space-memo', 'uploads/alice/space.png'),
      attachmentOn('alices-comment', 'uploads/alice/comment.png'),
    ]);
    const storage = createFakeStorage();

    await deleteAlice({ storage });

    const [spaceMemo] = await as(bob).memos.space.list({ spaceId: 'club' });
    expect(spaceMemo?.attachments.map(({ storageKey }) => storageKey)).toEqual(['uploads/alice/space.png']);
    const [comment] = await as(bob).memos.listComments({ memoId: 'bobs-memo' });
    expect(comment?.attachments.map(({ storageKey }) => storageKey)).toEqual(['uploads/alice/comment.png']);
    expect(storage.deletedKeys).toEqual([]);
  });

  it('removes from storage every attachment deleted with the account', async () => {
    await db.insert(memo).values(memoRow('personal-memo', { visibility: 'public' }));
    await db.insert(memo).values(memoRow('bobs-comment', { userId: bob.id, parentId: 'personal-memo', visibility: 'public' }));
    await db.insert(attachment).values([
      attachmentOn('personal-memo', 'uploads/alice/memo.png'),
      attachmentOn('bobs-comment', 'uploads/bob/comment.png', bob.id),
      attachmentOn(null, 'uploads/alice/pending.png'),
    ]);
    const storage = createFakeStorage();

    await deleteAlice({ storage });

    expect(storage.deletedKeys.sort()).toEqual([
      'uploads/alice/memo.png',
      'uploads/alice/pending.png',
      'uploads/bob/comment.png',
    ]);
  });

  // The account is the source of truth: an object left in storage is a smaller harm than an
  // account that cannot be deleted while storage is down.
  it('deletes the account even when storage fails to remove an attachment, and logs it', async () => {
    await db.insert(memo).values(memoRow('personal-memo'));
    await db.insert(attachment).values([
      attachmentOn('personal-memo', 'uploads/alice/one.png'),
      attachmentOn('personal-memo', 'uploads/alice/two.png'),
    ]);
    const storage = createFakeStorage({ failingKeys: ['uploads/alice/one.png'] });
    const errors: unknown[] = [];
    const logger = { info: () => {}, debug: () => {}, error: (obj: unknown) => errors.push(obj) };

    await deleteAlice({ storage, logger });

    expect(await db.select().from(user).where(eq(user.id, alice.id))).toEqual([]);
    expect(storage.deletedKeys).toEqual(['uploads/alice/two.png']);
    expect(errors).toEqual([expect.objectContaining({ storageKey: 'uploads/alice/one.png' })]);
  });

  it('is refused, changing nothing, when the user is the last admin of spaces with other members, and names them', async () => {
    await db.insert(space).values([
      spaceRow('club', 'Cooking club'),
      spaceRow('band', 'Band'),
      spaceRow('shared', 'Shared admin'),
    ]);
    await db.insert(spaceMember).values([
      { spaceId: 'club', userId: alice.id, role: 'admin', joinedAt: new Date() },
      { spaceId: 'club', userId: bob.id, role: 'member', joinedAt: new Date() },
      { spaceId: 'band', userId: alice.id, role: 'admin', joinedAt: new Date() },
      { spaceId: 'band', userId: carol.id, role: 'member', joinedAt: new Date() },
      { spaceId: 'shared', userId: alice.id, role: 'admin', joinedAt: new Date() },
      { spaceId: 'shared', userId: bob.id, role: 'admin', joinedAt: new Date() },
    ]);
    await db.insert(memo).values([memoRow('personal-memo'), memoRow('space-memo', inSpace('club'))]);
    await db.insert(attachment).values(attachmentOn('personal-memo', 'uploads/alice/memo.png'));
    const before = await snapshot();
    const storage = createFakeStorage();

    expect(await refusal(deleteAlice({ storage }))).toEqual({
      code: 'CONFLICT',
      message: expect.stringContaining('admin'),
      spaces: [
        { id: 'band', name: 'Band' },
        { id: 'club', name: 'Cooking club' },
      ],
    });
    expect(await snapshot()).toEqual(before);
    expect(storage.deletedKeys).toEqual([]);
  });

  it('deletes a space whose only member is the user, with its memos and their attachments', async () => {
    await db.insert(space).values(spaceRow('diary', 'Diary'));
    await db.insert(spaceMember).values({ spaceId: 'diary', userId: alice.id, role: 'admin', joinedAt: new Date() });
    // Written by Bob before he left: the space owns it, so it goes with the space.
    await db.insert(memo).values([memoRow('diary-memo', inSpace('diary')), memoRow('left-behind', { userId: bob.id, ...inSpace('diary') })]);
    await db.insert(attachment).values([
      attachmentOn('diary-memo', 'uploads/alice/diary.png'),
      attachmentOn('left-behind', 'uploads/bob/left.png', bob.id),
    ]);
    const storage = createFakeStorage();

    await deleteAlice({ storage });

    expect(await db.select().from(space)).toEqual([]);
    expect(await memoIds()).toEqual([]);
    expect(storage.deletedKeys.sort()).toEqual(['uploads/alice/diary.png', 'uploads/bob/left.png']);
  });

  it('signs the user out everywhere', async () => {
    const sessionOn = (id: string) => ({
      id,
      token: `token-${id}`,
      userId: alice.id,
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(session).values([sessionOn('laptop'), sessionOn('phone')]);

    await deleteAlice();

    expect(await db.select().from(session).where(eq(session.userId, alice.id))).toEqual([]);
  });

  it('leaves a memo the Former user now holds for a space admin to delete', async () => {
    await db.insert(space).values(spaceRow('club', 'Cooking club'));
    await db.insert(spaceMember).values([
      { spaceId: 'club', userId: alice.id, role: 'member', joinedAt: new Date() },
      { spaceId: 'club', userId: bob.id, role: 'admin', joinedAt: new Date() },
    ]);
    await db.insert(memo).values(memoRow('space-memo', inSpace('club')));
    await deleteAlice();

    await as(bob).memos.delete({ id: 'space-memo' });

    expect(await memoIds()).toEqual([]);
  });
});

describe('confirming a deletion', () => {
  beforeEach(async () => {
    await db.insert(memo).values(memoRow('personal-memo'));
  });

  it('is refused, changing nothing, with a wrong password', async () => {
    const before = await snapshot();

    expect(await refusal(as(alice).account.delete({ email: alice.email, password: 'wrong-password' }))).toEqual({
      code: 'BAD_REQUEST',
      message: 'Incorrect password',
      spaces: null,
    });
    expect(await snapshot()).toEqual(before);
  });

  it('is refused, changing nothing, without the password of an account that has one', async () => {
    const before = await snapshot();

    expect(await refusal(as(alice).account.delete({ email: alice.email }))).toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Incorrect password',
    });
    expect(await snapshot()).toEqual(before);
  });

  it('is refused, changing nothing, when the email typed is not the user\'s', async () => {
    const before = await snapshot();

    expect(await refusal(as(alice).account.delete({ email: bob.email, password: PASSWORD }))).toMatchObject({
      code: 'BAD_REQUEST',
      message: 'The email does not match your account',
    });
    expect(await snapshot()).toEqual(before);
  });

  it('accepts the email typed in another case', async () => {
    await as(alice).account.delete({ email: 'ALICE@Example.com', password: PASSWORD });

    expect(await db.select().from(user).where(eq(user.id, alice.id))).toEqual([]);
  });
});

describe('deleting an account that signs in with Google only', () => {
  beforeEach(async () => {
    await db.delete(account).where(eq(account.userId, alice.id));
    await db.insert(account).values(googleAccountOf(alice.id));
  });

  it('is refused, changing nothing, when the user signed in more than 10 minutes ago', async () => {
    const before = await snapshot();

    expect(
      await refusal(
        as(alice, { sessionCreatedAt: new Date(Date.now() - 11 * MINUTE) }).account.delete({ email: alice.email }),
      ),
    ).toMatchObject({ code: 'PRECONDITION_FAILED', message: 'Sign in again to delete your account' });
    expect(await snapshot()).toEqual(before);
  });

  it('deletes the account when the user signed in within the last 10 minutes', async () => {
    await as(alice, { sessionCreatedAt: new Date(Date.now() - 9 * MINUTE) }).account.delete({ email: alice.email });

    expect(await db.select().from(user).where(eq(user.id, alice.id))).toEqual([]);
  });
});
