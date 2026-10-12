import { type DatabaseInstance, eq, memo, space, spaceMember, sql, user } from '@repo/db';
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
const gym = { id: 'gym', title: 'Gym', createdAt: new Date(), updatedAt: new Date() };

// Alice is the admin of the club, Bob a member who reads it; both are members of the gym.
// The outsider is a member of nothing.
beforeEach(async () => {
  await db.delete(memo);
  await db.delete(space);
  await db.delete(user);
  await db.insert(user).values([alice, bob, outsider]);
  await db.insert(space).values([club, gym]);
  await db.insert(spaceMember).values([
    { spaceId: club.id, userId: alice.id, role: 'admin', joinedAt: new Date() },
    { spaceId: club.id, userId: bob.id, role: 'member', joinedAt: new Date() },
    { spaceId: gym.id, userId: alice.id, role: 'admin', joinedAt: new Date() },
    { spaceId: gym.id, userId: bob.id, role: 'member', joinedAt: new Date() },
  ]);
});

const MINUTE = 60_000;
const START = Date.UTC(2026, 0, 1);

// Memos written into a space a minute apart, oldest first, by Alice unless told otherwise:
// `spaceMemos(3)` is three memos of the club, oldest to newest.
const spaceMemos = async (
  count: number,
  {
    from = 0,
    content = 'Memo',
    spaceId = club.id,
    userId = alice.id,
    at = (i: number) => new Date(START + i * MINUTE),
  } = {},
) => {
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `${spaceId}-memo-${String(from + i).padStart(3, '0')}`,
    userId,
    spaceId,
    content: `${content} ${from + i}`,
    tags: content.match(/#(\w+)/g)?.map((t) => t.slice(1)) ?? [],
    visibility: 'space' as const,
    createdAt: at(from + i),
    updatedAt: at(from + i),
  }));
  await db.insert(memo).values(rows);
  return rows.map((r) => r.id);
};

// Pins memos in the order given, a minute apart: the last one named is on top.
const pin = async (...ids: string[]) => {
  for (const [i, id] of ids.entries()) {
    await db.update(memo).set({ pinnedAt: new Date(START + (10_000 + i) * MINUTE) }).where(eq(memo.id, id));
  }
};

const as = (u: { id: string }) => createAuthenticatedCaller(db, u.id);

type ListInput = Omit<Parameters<ReturnType<typeof as>['memos']['space']['list']>[0], 'spaceId'>;

const newestFirst = (ids: string[]) => [...ids].reverse();

// Every page of the club as Bob reads it, following each next cursor until there is none:
// the ids of each page.
const walk = async (input: ListInput = {}, between?: (pageRead: number) => Promise<void>) => {
  const pages: string[][] = [];
  let cursor: string | undefined;
  do {
    const page = await as(bob).memos.space.list({ ...input, spaceId: club.id, cursor });
    pages.push(page.items.map((m) => m.id));
    cursor = page.nextCursor ?? undefined;
    if (pages.length > 100) throw new Error('The space never ends');
    if (cursor) await between?.(pages.length);
  } while (cursor);
  return pages;
};

describe('walking every page of a space', () => {
  it('returns all of its memos in its order, pinned first, across a boundary inside the pinned block and one after it', async () => {
    const ids = await spaceMemos(45);
    // 25 pinned, so the first page ends among them and the second after them.
    const pinned = ids.slice(0, 25);
    await pin(...pinned);
    const rest = ids.slice(25);

    const pages = await walk();

    expect(pages.map((p) => p.length)).toEqual([20, 20, 5]);
    expect(pages.flat()).toEqual([...newestFirst(pinned), ...newestFirst(rest)]);
  });
});

// The memos Bob still gets after the first page, once the club changed under him.
const restAfterAChange = async (change: () => Promise<void>) => {
  const pages = await walk({}, async (pageRead) => {
    if (pageRead === 1) await change();
  });
  return { first: pages[0]!, rest: pages.slice(1).flat() };
};

describe('a change to a space between two pages', () => {
  // 10 pinned then 40 others: the first page ends among the others, at the 10th of them.
  const theClub = async () => {
    const ids = await spaceMemos(50);
    await pin(...ids.slice(0, 10));
    return { pinned: newestFirst(ids.slice(0, 10)), others: newestFirst(ids.slice(10)) };
  };

  it('a memo written meanwhile repeats nothing and skips nothing among the rest', async () => {
    const { others } = await theClub();

    const { rest } = await restAfterAChange(async () => {
      await as(alice).memos.space.create({ spaceId: club.id, content: 'Written meanwhile' });
    });

    expect(rest).toEqual(others.slice(10));
  });

  it('a memo an admin pinned meanwhile, read or not yet, repeats nothing and skips nothing among the rest', async () => {
    const { others } = await theClub();
    const alreadyRead = others[0]!;
    const notYetRead = others[20]!;

    const { rest } = await restAfterAChange(async () => {
      await as(alice).memos.pin({ id: alreadyRead });
      await as(alice).memos.pin({ id: notYetRead });
    });

    expect(rest).toEqual(others.slice(10).filter((id) => id !== notYetRead));
  });

  it('a memo unpinned meanwhile repeats nothing and skips nothing among the rest', async () => {
    const ids = await spaceMemos(50);
    // 25 pinned: the first page ends inside the pinned block.
    await pin(...ids.slice(0, 25));
    const pinned = newestFirst(ids.slice(0, 25));
    const others = newestFirst(ids.slice(25));
    const alreadyRead = pinned[0]!;
    const notYetRead = pinned[22]!;

    const { rest } = await restAfterAChange(async () => {
      await as(alice).memos.unpin({ id: alreadyRead });
      await as(alice).memos.unpin({ id: notYetRead });
    });

    // Both now take their place by date among the others, below the cursor, and show
    // there: Bob sees them, and every other memo exactly once.
    const moved = [alreadyRead, notYetRead];
    expect(rest.filter((id) => !moved.includes(id))).toEqual([...pinned.slice(20), ...others].filter((id) => !moved.includes(id)));
    expect(rest.filter((id) => moved.includes(id))).toHaveLength(2);
  });

  it('a memo moved out meanwhile, read or not yet, repeats nothing and skips nothing among the rest', async () => {
    const { pinned, others } = await theClub();
    const alreadyRead = pinned[0]!;
    const notYetRead = others[15]!;

    const { rest } = await restAfterAChange(async () => {
      await as(alice).memos.move({ id: alreadyRead, visibility: 'private' });
      await as(alice).memos.move({ id: notYetRead, visibility: 'private' });
    });

    expect(rest).toEqual(others.slice(10).filter((id) => id !== notYetRead));
  });

  it('a memo deleted meanwhile, the last one read included, repeats nothing and skips nothing among the rest', async () => {
    const { others } = await theClub();
    const lastRead = others[9]!;
    const notYetRead = others[15]!;

    const { first, rest } = await restAfterAChange(async () => {
      await as(alice).memos.delete({ id: lastRead });
      await as(alice).memos.delete({ id: notYetRead });
    });

    expect(first.at(-1)).toBe(lastRead);
    expect(rest).toEqual(others.slice(10).filter((id) => id !== notYetRead));
  });
});

describe('memos written at the same instant', () => {
  it('are each returned exactly once, across page boundaries', async () => {
    const sameInstant = new Date(START);
    const ids = await spaceMemos(45, { at: () => sameInstant });

    const pages = await walk();

    expect(pages.map((p) => p.length)).toEqual([20, 20, 5]);
    expect([...pages.flat()].sort()).toEqual([...ids].sort());
  });

  it('are each returned exactly once, in their order, when they share a millisecond', async () => {
    const ids = Array.from({ length: 45 }, (_, i) => `club-memo-${String(i).padStart(3, '0')}`);
    await db.insert(memo).values(ids.map((id, i) => ({
      id,
      userId: i % 2 ? alice.id : bob.id,
      spaceId: club.id,
      content: `Memo ${i}`,
      visibility: 'space' as const,
      createdAt: sql`'2026-01-01 00:00:00'::timestamp + ${i} * interval '1 microsecond'`,
      updatedAt: new Date(START),
    })));

    expect((await walk()).flat()).toEqual(newestFirst(ids));
  });
});

describe('a filtered space, a page at a time', () => {
  it('combines the tag with the cursor', async () => {
    const cooking = await spaceMemos(25, { content: 'Pasta #cooking' });
    await spaceMemos(25, { from: 100, content: 'Gym' });

    expect((await walk({ tag: 'cooking' })).flat()).toEqual(newestFirst(cooking));
  });

  it('combines the query with the cursor', async () => {
    const pasta = await spaceMemos(25, { content: 'Pasta' });
    await spaceMemos(25, { from: 100, content: 'Gym' });

    expect((await walk({ query: 'past' })).flat()).toEqual(newestFirst(pasta));
  });

  it('combines the date with the cursor', async () => {
    const day = (d: number) => (i: number) => new Date(START + d * 24 * 60 * MINUTE + i * MINUTE);
    const onTheSecond = await spaceMemos(25, { at: day(1) });
    await spaceMemos(25, { from: 100, at: day(2) });

    expect((await walk({ date: '2026-01-02' })).flat()).toEqual(newestFirst(onTheSecond));
  });
});

describe('the end of a space', () => {
  it('is a last page without a next cursor, even when it is full', async () => {
    await spaceMemos(40);

    expect((await walk()).map((p) => p.length)).toEqual([20, 20]);
  });

  it('is reached at once on an empty space: no memo, no cursor', async () => {
    expect(await as(bob).memos.space.list({ spaceId: club.id })).toEqual({ items: [], nextCursor: null });
  });
});

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

const invalidCursor = { code: 'BAD_REQUEST', message: 'Invalid cursor' };

const clubAt = (cursor: string) => as(bob).memos.space.list({ spaceId: club.id, cursor });

const forge = (list: string, key: unknown[]) => Buffer.from(JSON.stringify({ list, key })).toString('base64url');

describe('a cursor the space did not issue', () => {
  it('is refused as a bad request when malformed', async () => {
    await spaceMemos(25);
    const { nextCursor } = await as(bob).memos.space.list({ spaceId: club.id });
    const truncated = nextCursor!.slice(0, -4);

    for (const cursor of ['garbage', '', truncated, Buffer.from('{"list":"space:club"}').toString('base64url')]) {
      expect(await refusal(clubAt(cursor))).toEqual(invalidCursor);
    }
  });

  it('is refused as a bad request when it comes from another space, one the reader is a member of', async () => {
    await spaceMemos(25);
    await spaceMemos(25, { spaceId: gym.id });
    const { nextCursor: ofTheGym } = await as(bob).memos.space.list({ spaceId: gym.id });

    expect(await refusal(clubAt(ofTheGym!))).toEqual(invalidCursor);
  });

  it('is refused as a bad request when it comes from the personal scope', async () => {
    await db.insert(memo).values(Array.from({ length: 25 }, (_, i) => ({
      id: `personal-${i}`,
      userId: bob.id,
      content: `Personal ${i}`,
      visibility: 'private' as const,
      createdAt: new Date(START + i * MINUTE),
      updatedAt: new Date(START + i * MINUTE),
    })));
    const { nextCursor: ofThePersonalScope } = await as(bob).memos.list({});

    expect(await refusal(clubAt(ofThePersonalScope!))).toEqual(invalidCursor);
  });

  it('is refused as a bad request when it comes from Explore', async () => {
    await db.insert(memo).values(Array.from({ length: 25 }, (_, i) => ({
      id: `public-${i}`,
      userId: bob.id,
      content: `Public ${i}`,
      visibility: 'public' as const,
      createdAt: new Date(START + i * MINUTE),
      updatedAt: new Date(START + i * MINUTE),
    })));
    const { nextCursor: ofExplore } = await as(bob).memos.listPublic({});

    expect(await refusal(clubAt(ofExplore!))).toEqual(invalidCursor);
  });
});

describe('a non-member', () => {
  const spaceNotFound = { code: 'NOT_FOUND', message: 'Space not found' };

  it('is refused without a cursor, as for a space that does not exist', async () => {
    await spaceMemos(25);

    expect(await refusal(as(outsider).memos.space.list({ spaceId: club.id }))).toEqual(spaceNotFound);
  });

  // The membership is checked before the cursor is read: a member's real cursor, a garbled
  // one, it makes no difference, and nothing tells the outsider whether their cursor was good.
  it('is refused with a cursor, whether the cursor is valid or not', async () => {
    await spaceMemos(25);
    const { nextCursor } = await as(bob).memos.space.list({ spaceId: club.id });

    for (const cursor of [nextCursor!, 'garbage']) {
      expect(await refusal(as(outsider).memos.space.list({ spaceId: club.id, cursor }))).toEqual(spaceNotFound);
    }
  });
});

describe('what a cursor may reveal', () => {
  // Around the club's memos, everything it does not list: the gym's memos, the members'
  // personal memos, and the comments under the club's memos.
  const surroundings = async () => {
    const own = await spaceMemos(25);
    await spaceMemos(25, { spaceId: gym.id });
    await db.insert(memo).values(Array.from({ length: 5 }, (_, i) => ({
      id: `alice-personal-${i}`,
      userId: alice.id,
      content: `Personal ${i}`,
      visibility: 'private' as const,
      createdAt: new Date(START + (100 + i) * MINUTE),
      updatedAt: new Date(START + (100 + i) * MINUTE),
    })));
    await db.insert(memo).values(own.slice(0, 5).map((parentId, i) => ({
      id: `club-comment-${i}`,
      userId: bob.id,
      parentId,
      spaceId: club.id,
      content: `Comment ${i}`,
      visibility: 'space' as const,
      createdAt: new Date(START + (200 + i) * MINUTE),
      updatedAt: new Date(START + (200 + i) * MINUTE),
    })));
    return { own };
  };

  it('is never a memo outside the space, however it is walked', async () => {
    const { own } = await surroundings();

    expect((await walk()).flat()).toEqual(newestFirst(own));
  });

  it('is never another space’s memo, a personal memo nor a comment, whatever the cursor says', async () => {
    const { own } = await surroundings();
    // A cursor resuming above everything, as a forger would place it.
    const forged = forge('space:club', [null, '2030-01-01 00:00:00', 'zzz']);

    const { items } = await clubAt(forged);

    expect(items.map((m) => m.id)).toEqual(newestFirst(own).slice(0, 20));
  });
});
