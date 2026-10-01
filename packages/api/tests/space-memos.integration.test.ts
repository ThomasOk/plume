import { type DatabaseInstance, memo, notification, outbox, space, spaceMember, user } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { drainOnce } from '../src/server/events/outbox';
import { createEventBusWithHandlers } from '../src/server/events/register-handlers';
import { startTestDatabase, stopTestDatabase } from './helpers/db';
import { createFakeEmailSender } from './helpers/email';
import { TEST_INVITATION_LINKS, createAuthenticatedCaller, createTestCaller } from './helpers/trpc';

let db: DatabaseInstance;

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

const userRow = (id: string, name: string) => ({
  id,
  name,
  email: `${id}@example.com`,
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const alice = userRow('alice', 'Alice');
const bob = userRow('bob', 'Bob');
const outsider = userRow('outsider', 'Outsider');

const club = { id: 'club', title: 'Cooking club', createdAt: new Date(), updatedAt: new Date() };

// The error a caller sees, reduced to what crosses the wire.
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

// Alice and Bob are members of the club; the outsider is a member of nothing. Membership
// is written directly: joining a space by invitation is another ticket.
beforeEach(async () => {
  await db.delete(notification);
  await db.delete(outbox);
  await db.delete(memo);
  await db.delete(space);
  await db.delete(user);
  await db.insert(user).values([alice, bob, outsider]);
  await db.insert(space).values(club);
  await db.insert(spaceMember).values([
    { spaceId: club.id, userId: alice.id, role: 'admin', joinedAt: new Date() },
    { spaceId: club.id, userId: bob.id, role: 'member', joinedAt: new Date() },
  ]);
});

const as = (u: { id: string }) => createAuthenticatedCaller(db, u.id);

describe('writing a memo into a space', () => {
  it('is read by every member, with its author', async () => {
    const written = await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' });

    const listed = await as(bob).memos.space.list({ spaceId: club.id });

    expect(listed).toEqual([
      expect.objectContaining({
        id: written.id,
        content: 'Pasta night',
        visibility: 'space',
        author: expect.objectContaining({ name: 'Alice' }),
      }),
    ]);
  });
});

describe('the audience of a memo written into a space', () => {
  it('cannot be private or public', async () => {
    for (const visibility of ['private', 'public'] as const) {
      const result = await refusal(
        // @ts-expect-error — the type already refuses it; the server must too.
        as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night', visibility }),
      );
      expect(result.code).toBe('BAD_REQUEST');
    }
    expect(await db.select().from(memo)).toEqual([]);
  });

  it('cannot be a space when no space is named', async () => {
    const result = await refusal(as(alice).memos.create({ content: 'Pasta night', visibility: 'space' }));

    expect(result.code).toBe('BAD_REQUEST');
    expect(await db.select().from(memo)).toEqual([]);
  });

  it('is refused to a non-member as if the space did not exist', async () => {
    const forExisting = await refusal(
      as(outsider).memos.space.create({ spaceId: club.id, content: 'Let me in' }),
    );
    const forMissing = await refusal(
      as(outsider).memos.space.create({ spaceId: 'no-such-space', content: 'Let me in' }),
    );

    expect(forExisting).toEqual({ code: 'NOT_FOUND', message: 'Space not found' });
    expect(forMissing).toEqual(forExisting);
    expect(await db.select().from(memo)).toEqual([]);
  });
});

describe('reading one memo of a space', () => {
  let memoId: string;

  beforeEach(async () => {
    memoId = (await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' })).id;
  });

  it('is open to every member, with its author', async () => {
    const read = await as(bob).memos.getById({ id: memoId });

    expect(read).toEqual(
      expect.objectContaining({ id: memoId, author: expect.objectContaining({ name: 'Alice' }) }),
    );
  });

  it('answers a non-member exactly as for a memo that does not exist', async () => {
    const forExisting = await refusal(as(outsider).memos.getById({ id: memoId }));
    const forMissing = await refusal(as(outsider).memos.getById({ id: 'no-such-memo' }));

    expect(forExisting).toEqual({ code: 'NOT_FOUND', message: 'Memo not found' });
    expect(forMissing).toEqual(forExisting);
  });
});

describe('commenting on a memo of a space', () => {
  let memoId: string;

  beforeEach(async () => {
    memoId = (await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' })).id;
  });

  it('takes the space and the visibility of the memo commented on', async () => {
    const comment = await as(bob).memos.create({ content: 'I bring the wine', parentId: memoId });

    expect(comment).toEqual(expect.objectContaining({ spaceId: club.id, visibility: 'space' }));
  });

  it('is read by every member, with its author', async () => {
    await as(bob).memos.create({ content: 'I bring the wine', parentId: memoId });

    const comments = await as(alice).memos.listComments({ memoId });

    expect(comments).toEqual([
      expect.objectContaining({
        content: 'I bring the wine',
        author: expect.objectContaining({ name: 'Bob' }),
      }),
    ]);
  });

  it('is refused to a non-member as if the memo did not exist', async () => {
    const forExisting = await refusal(
      as(outsider).memos.create({ content: 'Me too', parentId: memoId }),
    );
    const forMissing = await refusal(
      as(outsider).memos.create({ content: 'Me too', parentId: 'no-such-memo' }),
    );

    expect(forExisting).toEqual({ code: 'NOT_FOUND', message: 'Memo not found' });
    expect(forMissing).toEqual(forExisting);
    expect(await refusal(as(outsider).memos.listComments({ memoId }))).toEqual(forExisting);
  });
});

describe('the notification of a comment on a memo of a space', () => {
  const carol = userRow('carol', 'Carol');

  beforeEach(async () => {
    await db.insert(user).values(carol);
    await db
      .insert(spaceMember)
      .values({ spaceId: club.id, userId: carol.id, role: 'member', joinedAt: new Date() });
  });

  it('goes to the author of the memo, and to no other member', async () => {
    const { id: memoId } = await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' });
    await as(bob).memos.create({ content: 'I bring the wine', parentId: memoId });
    const emails = createFakeEmailSender();

    await drainOnce({ db, bus: createEventBusWithHandlers(db, emails, TEST_INVITATION_LINKS) });

    const notifications = await db.select().from(notification);
    expect(notifications.map((n) => n.receiverId)).toEqual([alice.id]);
    expect(emails.sent.map((m) => m.to)).toEqual([alice.email]);
  });
});

describe('an attachment on a memo of a space', () => {
  let memoId: string;

  // Alice uploads a file and attaches it to her memo in the club.
  beforeEach(async () => {
    memoId = (await as(alice).memos.space.create({ spaceId: club.id, content: 'The recipe' })).id;
    const { id } = await as(alice).attachments.getUploadUrl({
      filename: 'recipe.pdf',
      mimeType: 'application/pdf',
      size: 1024,
    });
    await as(alice).attachments.confirmUpload({ id, memoId });
  });

  it('is read by every member', async () => {
    const attachments = await as(bob).attachments.listByMemo({ memoId });

    expect(attachments.map((a) => a.filename)).toEqual(['recipe.pdf']);
    expect((await as(bob).memos.getById({ id: memoId })).attachments).toHaveLength(1);
  });

  it('is refused to a non-member as if the memo did not exist', async () => {
    const forExisting = await refusal(as(outsider).attachments.listByMemo({ memoId }));
    const forMissing = await refusal(as(outsider).attachments.listByMemo({ memoId: 'no-such-memo' }));

    expect(forExisting).toEqual({ code: 'NOT_FOUND', message: 'Memo not found' });
    expect(forMissing).toEqual(forExisting);
  });

  it('cannot be added by anyone but the author of the memo', async () => {
    for (const intruder of [bob, outsider]) {
      const { id } = await as(intruder).attachments.getUploadUrl({
        filename: 'intrusion.png',
        mimeType: 'image/png',
        size: 1024,
      });

      const result = await refusal(as(intruder).attachments.confirmUpload({ id, memoId }));

      expect(result.code).toBe('NOT_FOUND');
    }
    const attachments = await as(alice).attachments.listByMemo({ memoId });
    expect(attachments.map((a) => a.filename)).toEqual(['recipe.pdf']);
  });

  it('stays on the attachments page of whoever uploaded it, and only theirs', async () => {
    expect((await as(alice).attachments.list()).map((a) => a.filename)).toEqual(['recipe.pdf']);
    expect(await as(bob).attachments.list()).toEqual([]);
  });
});

describe('the memos of a space outside the space', () => {
  beforeEach(async () => {
    const { id: memoId } = await as(alice).memos.space.create({
      spaceId: club.id,
      content: 'Pasta night #cooking',
    });
    await as(bob).memos.create({ content: 'I bring the wine', parentId: memoId });
  });

  it('are absent from the personal views of their author', async () => {
    expect(await as(alice).memos.list({})).toEqual([]);
    expect(await as(alice).memos.tags()).toEqual({});
    expect(await as(alice).memos.stats()).toEqual({});
  });

  it('are absent from Explore', async () => {
    expect(await createTestCaller(db).memos.listPublic({})).toEqual([]);
    expect(await createTestCaller(db).memos.publicTags()).toEqual({});
  });
});

describe('editing a memo of a space', () => {
  let memoId: string;

  beforeEach(async () => {
    memoId = (await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' })).id;
  });

  it('changes its content and leaves it in the space', async () => {
    await as(alice).memos.update({ id: memoId, content: 'Pizza night', visibility: 'space' });

    const listed = await as(bob).memos.space.list({ spaceId: club.id });
    expect(listed).toEqual([expect.objectContaining({ id: memoId, content: 'Pizza night' })]);
  });

  it('cannot take it out of the space', async () => {
    for (const visibility of ['private', 'public'] as const) {
      const result = await refusal(as(alice).memos.update({ id: memoId, content: 'Mine now', visibility }));
      expect(result.code).toBe('BAD_REQUEST');
    }

    const listed = await as(bob).memos.space.list({ spaceId: club.id });
    expect(listed).toEqual([expect.objectContaining({ id: memoId, content: 'Pasta night' })]);
  });
});

describe('another user acting on a memo of a space', () => {
  let memoId: string;

  beforeEach(async () => {
    memoId = (await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' })).id;
  });

  it('is refused to a member, who may read it but did not write it', async () => {
    const result = await refusal(
      as(bob).memos.update({ id: memoId, content: 'Bob was here', visibility: 'space' }),
    );

    expect(result.code).toBe('FORBIDDEN');
  });

  it('answers a non-member exactly as for a memo that does not exist', async () => {
    const missing = { code: 'NOT_FOUND', message: 'Memo not found' };

    expect(
      await refusal(as(outsider).memos.update({ id: memoId, content: 'Hi', visibility: 'space' })),
    ).toEqual(missing);
    expect(await refusal(as(outsider).memos.delete({ id: memoId }))).toEqual(missing);
  });
});

describe('moving a personal memo into a space', () => {
  let memoId: string;

  beforeEach(async () => {
    memoId = (await as(alice).memos.create({ content: 'Pasta night #cooking', visibility: 'private' })).id;
  });

  it('leaves the personal scope and joins the space', async () => {
    await as(alice).memos.space.move({ spaceId: club.id, id: memoId });

    expect(await as(alice).memos.list({})).toEqual([]);
    expect(await as(alice).memos.tags()).toEqual({});
    expect(await as(alice).memos.stats()).toEqual({});

    expect(await as(bob).memos.space.list({ spaceId: club.id })).toEqual([
      expect.objectContaining({ id: memoId, visibility: 'space' }),
    ]);
    expect(await as(bob).memos.space.tags({ spaceId: club.id })).toEqual({ cooking: 1 });
    expect(Object.values(await as(bob).memos.space.stats({ spaceId: club.id }))).toEqual([1]);
  });
});

describe('moving a memo out of a space', () => {
  let memoId: string;

  beforeEach(async () => {
    memoId = (await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night #cooking' })).id;
  });

  it('makes it personal with the audience its author chose', async () => {
    for (const visibility of ['private', 'public'] as const) {
      await as(alice).memos.move({ id: memoId, visibility });

      expect(await as(alice).memos.list({})).toEqual([
        expect.objectContaining({ id: memoId, visibility }),
      ]);
      expect(await as(alice).memos.tags()).toEqual({ cooking: 1 });
      expect(await as(bob).memos.space.list({ spaceId: club.id })).toEqual([]);
      expect(await as(bob).memos.space.tags({ spaceId: club.id })).toEqual({});
      expect(await as(bob).memos.space.stats({ spaceId: club.id })).toEqual({});

      await as(alice).memos.space.move({ spaceId: club.id, id: memoId });
    }
  });

  it('is refused without an audience, and leaves the memo where it was', async () => {
    // @ts-expect-error — the type already requires it; the server must too.
    const result = await refusal(as(alice).memos.move({ id: memoId }));

    expect(result.code).toBe('BAD_REQUEST');
    expect(await as(bob).memos.space.list({ spaceId: club.id })).toEqual([
      expect.objectContaining({ id: memoId }),
    ]);
  });
});

describe('who may move a memo', () => {
  const missingMemo = { code: 'NOT_FOUND', message: 'Memo not found' };

  it('is refused into a space the user is not a member of, as if it did not exist', async () => {
    const { id: memoId } = await as(outsider).memos.create({ content: 'Let me in', visibility: 'private' });

    const result = await refusal(as(outsider).memos.space.move({ spaceId: club.id, id: memoId }));

    expect(result).toEqual({ code: 'NOT_FOUND', message: 'Space not found' });
    expect(await as(outsider).memos.list({})).toEqual([expect.objectContaining({ id: memoId })]);
  });

  it('is refused to a member who did not write it, admin included', async () => {
    const { id: alicesMemo } = await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' });
    const { id: bobsMemo } = await as(bob).memos.space.create({ spaceId: club.id, content: 'Wine list' });

    // Bob is a member, Alice an admin: deleting is moderation, moving is not.
    expect((await refusal(as(bob).memos.move({ id: alicesMemo, visibility: 'public' }))).code).toBe('FORBIDDEN');
    expect((await refusal(as(alice).memos.move({ id: bobsMemo, visibility: 'public' }))).code).toBe('FORBIDDEN');

    const listed = await as(alice).memos.space.list({ spaceId: club.id });
    expect(listed.map((m) => m.id).sort()).toEqual([alicesMemo, bobsMemo].sort());
  });

  it('answers a user who cannot read the memo exactly as for a memo that does not exist', async () => {
    const { id: spaceMemo } = await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' });
    const { id: privateMemo } = await as(alice).memos.create({ content: 'Diary', visibility: 'private' });

    expect(await refusal(as(outsider).memos.move({ id: spaceMemo, visibility: 'private' }))).toEqual(missingMemo);
    expect(await refusal(as(bob).memos.space.move({ spaceId: club.id, id: privateMemo }))).toEqual(missingMemo);
    expect(await refusal(as(bob).memos.space.move({ spaceId: club.id, id: 'no-such-memo' }))).toEqual(missingMemo);
    expect(await as(alice).memos.list({})).toEqual([expect.objectContaining({ id: privateMemo })]);
  });
});

describe('the comments of a moved memo', () => {
  it('follow it into a space', async () => {
    const { id: memoId } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'public' });
    await as(alice).memos.create({ content: 'Fresh pasta only', parentId: memoId });

    await as(alice).memos.space.move({ spaceId: club.id, id: memoId });

    expect(await as(bob).memos.listComments({ memoId })).toEqual([
      expect.objectContaining({ content: 'Fresh pasta only', visibility: 'space' }),
    ]);
    expect(await refusal(createTestCaller(db).memos.listComments({ memoId }))).toEqual({
      code: 'NOT_FOUND',
      message: 'Memo not found',
    });
  });

  it('follow it out of a space when its author wrote them all', async () => {
    const { id: memoId } = await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' });
    await as(alice).memos.create({ content: 'Fresh pasta only', parentId: memoId });

    await as(alice).memos.move({ id: memoId, visibility: 'public' });

    expect(await createTestCaller(db).memos.listComments({ memoId })).toEqual([
      expect.objectContaining({ content: 'Fresh pasta only', visibility: 'public' }),
    ]);
  });

  it('keep it where it is when another member wrote one, whichever way it would go', async () => {
    // Bob wrote for the club. Taking the memo out would take his words to Explore, or out
    // of his own reach, without asking him.
    const { id: memoId } = await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' });
    await as(bob).memos.create({ content: 'I bring the wine', parentId: memoId });

    for (const visibility of ['private', 'public'] as const) {
      const result = await refusal(as(alice).memos.move({ id: memoId, visibility }));
      expect(result.code).toBe('CONFLICT');
    }
    const kitchen = { id: 'kitchen', title: 'Kitchen', createdAt: new Date(), updatedAt: new Date() };
    await db.insert(space).values(kitchen);
    await db.insert(spaceMember).values({ spaceId: kitchen.id, userId: alice.id, role: 'admin', joinedAt: new Date() });
    expect((await refusal(as(alice).memos.space.move({ spaceId: kitchen.id, id: memoId }))).code).toBe('CONFLICT');

    expect(await as(bob).memos.space.list({ spaceId: club.id })).toEqual([
      expect.objectContaining({ id: memoId }),
    ]);
    expect(await as(bob).memos.listComments({ memoId })).toEqual([
      expect.objectContaining({ content: 'I bring the wine', visibility: 'space' }),
    ]);
  });
});

describe('a public memo another user commented on', () => {
  it('stays out of a space, where its commenter could no longer read their own words', async () => {
    const { id: memoId } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'public' });
    await as(outsider).memos.create({ content: 'Looks great', parentId: memoId });

    const result = await refusal(as(alice).memos.space.move({ spaceId: club.id, id: memoId }));

    expect(result.code).toBe('CONFLICT');
    expect(await as(outsider).memos.listComments({ memoId })).toEqual([
      expect.objectContaining({ content: 'Looks great', visibility: 'public' }),
    ]);
  });
});

describe('the attachments of a moved memo', () => {
  it('follow its new audience', async () => {
    const { id: memoId } = await as(alice).memos.create({ content: 'The recipe', visibility: 'private' });
    const { id } = await as(alice).attachments.getUploadUrl({
      filename: 'recipe.pdf',
      mimeType: 'application/pdf',
      size: 1024,
    });
    await as(alice).attachments.confirmUpload({ id, memoId });

    await as(alice).memos.space.move({ spaceId: club.id, id: memoId });
    expect((await as(bob).attachments.listByMemo({ memoId })).map((a) => a.filename)).toEqual(['recipe.pdf']);

    await as(alice).memos.move({ id: memoId, visibility: 'private' });
    expect(await refusal(as(bob).attachments.listByMemo({ memoId }))).toEqual({
      code: 'NOT_FOUND',
      message: 'Memo not found',
    });
  });
});

describe('what a move does not do', () => {
  it('does not move a comment, which takes its memo’s place', async () => {
    const { id: memoId } = await as(alice).memos.create({ content: 'Pasta night', visibility: 'private' });
    const comment = await as(alice).memos.create({ content: 'Fresh pasta only', parentId: memoId });

    const result = await refusal(as(alice).memos.space.move({ spaceId: club.id, id: comment.id }));

    expect(result.code).toBe('BAD_REQUEST');
    expect(await as(alice).memos.listComments({ memoId })).toEqual([
      expect.objectContaining({ id: comment.id, visibility: 'private' }),
    ]);
  });

  it('does not move a memo where it already is', async () => {
    const { id: spaceMemo } = await as(alice).memos.space.create({ spaceId: club.id, content: 'Pasta night' });
    const { id: personalMemo } = await as(alice).memos.create({ content: 'Diary', visibility: 'private' });

    // Changing a personal memo between private and public is an edit, not a move.
    expect((await refusal(as(alice).memos.space.move({ spaceId: club.id, id: spaceMemo }))).code).toBe('BAD_REQUEST');
    expect((await refusal(as(alice).memos.move({ id: personalMemo, visibility: 'public' }))).code).toBe('BAD_REQUEST');
    expect(await as(alice).memos.list({})).toEqual([expect.objectContaining({ id: personalMemo, visibility: 'private' })]);
  });
});
