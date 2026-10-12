import { type DatabaseInstance, eq, inArray, memo, sql, user } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { startTestDatabase, stopTestDatabase } from './helpers/db';
import { createTestCaller } from './helpers/trpc';

let db: DatabaseInstance;

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

const alice = {
  id: 'alice',
  name: 'Alice',
  email: 'alice@example.com',
  emailVerified: true,
  image: null,
  isOperator: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(async () => {
  await db.delete(memo);
  await db.delete(user);
  await db.insert(user).values(alice);
});

const MINUTE = 60_000;
const START = Date.UTC(2026, 0, 1);

// Memos written a minute apart, oldest first, public unless told otherwise: `publicMemos(3)`
// is three public memos, oldest to newest.
const publicMemos = async (
  count: number,
  { from = 0, content = 'Memo', visibility = 'public' as 'public' | 'private', at = (i: number) => new Date(START + i * MINUTE) } = {},
) => {
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `memo-${String(from + i).padStart(3, '0')}`,
    userId: alice.id,
    content: `${content} ${from + i}`,
    tags: content.match(/#(\w+)/g)?.map((t) => t.slice(1)) ?? [],
    visibility,
    createdAt: at(from + i),
    updatedAt: at(from + i),
  }));
  await db.insert(memo).values(rows);
  return rows.map((r) => r.id);
};

// Features memos in the order given, a minute apart: the last one named is on top.
const feature = async (...ids: string[]) => {
  for (const [i, id] of ids.entries()) {
    await db.update(memo).set({ featuredAt: new Date(START + (10_000 + i) * MINUTE) }).where(eq(memo.id, id));
  }
};

type ListPublicInput = Parameters<ReturnType<typeof createTestCaller>['memos']['listPublic']>[0];

// Every page of Explore, following each next cursor until there is none: the ids of each page.
const newestFirst = (ids: string[]) => [...ids].reverse();

const walk = async (input: ListPublicInput = {}, between?: (pageRead: number) => Promise<void>) => {
  const pages: string[][] = [];
  let cursor: string | undefined;
  do {
    const page = await createTestCaller(db).memos.listPublic({ ...input, cursor });
    pages.push(page.items.map((m) => m.id));
    cursor = page.nextCursor ?? undefined;
    if (pages.length > 100) throw new Error('Explore never ends');
    if (cursor) await between?.(pages.length);
  } while (cursor);
  return pages;
};

describe('walking every page of Explore', () => {
  // `walk` reads as a visitor who is not signed in: Explore paginates for them too.
  it('returns the whole of Explore in its order, featured first, across a boundary inside the featured block and one after it', async () => {
    const ids = await publicMemos(45);
    // 25 featured, so the first page ends among them and the second after them.
    const featured = ids.slice(0, 25);
    await feature(...featured);
    const rest = ids.slice(25);

    const pages = await walk();

    expect(pages.map((p) => p.length)).toEqual([20, 20, 5]);
    expect(pages.flat()).toEqual([...newestFirst(featured), ...newestFirst(rest)]);
  });
});

// The memos a reader still gets after the first page, once the list changed under them.
const restAfterAChange = async (change: () => Promise<void>) => {
  const pages = await walk({}, async (pageRead) => {
    if (pageRead === 1) await change();
  });
  return { first: pages[0]!, rest: pages.slice(1).flat() };
};

describe('a change to Explore between two pages', () => {
  // 10 featured then 40 others: the first page ends among the others, at the 10th of them.
  const explore = async () => {
    const ids = await publicMemos(50);
    await feature(...ids.slice(0, 10));
    return { featured: newestFirst(ids.slice(0, 10)), others: newestFirst(ids.slice(10)) };
  };

  it('a memo published meanwhile repeats nothing and skips nothing among the rest', async () => {
    const { others } = await explore();

    const { rest } = await restAfterAChange(async () => {
      await publicMemos(1, { from: 900 });
    });

    expect(rest).toEqual(others.slice(10));
  });

  it('a memo featured meanwhile, read or not yet, repeats nothing and skips nothing among the rest', async () => {
    const { others } = await explore();
    const alreadyRead = others[0]!;
    const notYetRead = others[20]!;

    const { rest } = await restAfterAChange(() => feature(alreadyRead, notYetRead));

    expect(rest).toEqual(others.slice(10).filter((id) => id !== notYetRead));
  });

  it('a memo unfeatured meanwhile repeats nothing and skips nothing among the rest', async () => {
    const ids = await publicMemos(50);
    // 25 featured: the first page ends inside the featured block.
    await feature(...ids.slice(0, 25));
    const featured = newestFirst(ids.slice(0, 25));
    const others = newestFirst(ids.slice(25));
    const alreadyRead = featured[0]!;
    const notYetRead = featured[22]!;

    const { rest } = await restAfterAChange(async () => {
      await db.update(memo).set({ featuredAt: null }).where(inArray(memo.id, [alreadyRead, notYetRead]));
    });

    // Both now take their place by date among the others, below the cursor, and show
    // there: the reader sees them, and every other memo exactly once.
    const moved = [alreadyRead, notYetRead];
    expect(rest.filter((id) => !moved.includes(id))).toEqual([...featured.slice(20), ...others].filter((id) => !moved.includes(id)));
    expect(rest.filter((id) => moved.includes(id))).toHaveLength(2);
  });

  it('a memo deleted meanwhile, the last one read included, repeats nothing and skips nothing among the rest', async () => {
    const { others } = await explore();
    const lastRead = others[9]!;
    const notYetRead = others[15]!;

    const { first, rest } = await restAfterAChange(async () => {
      await db.delete(memo).where(inArray(memo.id, [lastRead, notYetRead]));
    });

    expect(first.at(-1)).toBe(lastRead);
    expect(rest).toEqual(others.slice(10).filter((id) => id !== notYetRead));
  });
});

describe('memos written at the same instant', () => {
  it('are each returned exactly once, across page boundaries', async () => {
    const sameInstant = new Date(START);
    const ids = await publicMemos(45, { at: () => sameInstant });

    const pages = await walk();

    expect(pages.map((p) => p.length)).toEqual([20, 20, 5]);
    expect([...pages.flat()].sort()).toEqual([...ids].sort());
  });
});

describe('memos written within the same millisecond', () => {
  // Postgres keeps microseconds, a JavaScript date only milliseconds: a memo written by
  // anything but the server (a script, a fix by hand) may carry them.
  it('are each returned exactly once, in their order', async () => {
    const ids = Array.from({ length: 45 }, (_, i) => `memo-${String(i).padStart(3, '0')}`);
    await db.insert(memo).values(ids.map((id, i) => ({
      id,
      userId: alice.id,
      content: `Memo ${i}`,
      visibility: 'public' as const,
      createdAt: sql`'2026-01-01 00:00:00'::timestamp + ${i} * interval '1 microsecond'`,
      updatedAt: new Date(START),
    })));

    expect((await walk()).flat()).toEqual(newestFirst(ids));
  });
});

describe('a filtered Explore, a page at a time', () => {
  it('combines the tag with the cursor', async () => {
    const cooking = await publicMemos(25, { content: 'Pasta #cooking' });
    await publicMemos(25, { from: 100, content: 'Gym' });

    expect((await walk({ tag: 'cooking' })).flat()).toEqual(newestFirst(cooking));
  });

  it('combines the query with the cursor', async () => {
    const pasta = await publicMemos(25, { content: 'Pasta' });
    await publicMemos(25, { from: 100, content: 'Gym' });

    expect((await walk({ query: 'past' })).flat()).toEqual(newestFirst(pasta));
  });

  it('combines the date with the cursor', async () => {
    const day = (d: number) => (i: number) => new Date(START + d * 24 * 60 * MINUTE + i * MINUTE);
    const onTheSecond = await publicMemos(25, { at: day(1) });
    await publicMemos(25, { from: 100, at: day(2) });

    expect((await walk({ date: '2026-01-02' })).flat()).toEqual(newestFirst(onTheSecond));
  });
});

describe('the end of Explore', () => {
  it('is a last page without a next cursor, even when it is full', async () => {
    await publicMemos(40);

    const pages = await walk();

    expect(pages.map((p) => p.length)).toEqual([20, 20]);
  });

  it('is reached at once on an empty Explore: no memo, no cursor', async () => {
    expect(await createTestCaller(db).memos.listPublic({})).toEqual({ items: [], nextCursor: null });
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

const listPublicAt = (cursor: string) => createTestCaller(db).memos.listPublic({ cursor });

describe('a cursor Explore did not issue', () => {
  it('is refused as a bad request when malformed', async () => {
    await publicMemos(25);
    const { nextCursor } = await createTestCaller(db).memos.listPublic({});
    const truncated = nextCursor!.slice(0, -4);

    for (const cursor of ['garbage', '', truncated, Buffer.from('{"list":"explore"}').toString('base64url')]) {
      expect(await refusal(listPublicAt(cursor))).toEqual({ code: 'BAD_REQUEST', message: 'Invalid cursor' });
    }
  });

  it('is refused as a bad request when it names an impossible instant', async () => {
    const forged = Buffer.from(JSON.stringify({ list: 'explore', key: [null, '2026-02-30 00:00:00', 'memo-001'] })).toString('base64url');

    expect((await refusal(listPublicAt(forged))).code).toBe('BAD_REQUEST');
  });

  // Forged until the personal scope issues cursors of its own (ticket 05).
  it('is refused as a bad request when issued for another list', async () => {
    const ofAnotherList = Buffer.from(JSON.stringify({ list: 'personal', key: [null, '2026-01-01 00:00:00', 'memo-001'] })).toString('base64url');

    expect((await refusal(listPublicAt(ofAnotherList))).code).toBe('BAD_REQUEST');
  });
});

describe('what a cursor may reveal', () => {
  it('is never a memo that is not public, however Explore is walked', async () => {
    const publicOnes = await publicMemos(30);
    await publicMemos(30, { from: 100, visibility: 'private' });
    // A public memo made private between two pages is gone from the pages that follow.
    const madePrivate = newestFirst(publicOnes)[25]!;

    const pages = await walk({}, async (pageRead) => {
      if (pageRead === 1) await db.update(memo).set({ visibility: 'private' }).where(eq(memo.id, madePrivate));
    });

    expect(pages.flat()).toEqual(newestFirst(publicOnes).filter((id) => id !== madePrivate));
  });

  it('is never a memo that is not public, whatever the cursor says', async () => {
    await publicMemos(5);
    const [privateOne] = await publicMemos(1, { from: 100, visibility: 'private' });
    // A cursor resuming just above the private memo, as a forger would place it.
    const forged = Buffer.from(JSON.stringify({ list: 'explore', key: [null, '2030-01-01 00:00:00', 'zzz'] })).toString('base64url');

    const { items } = await listPublicAt(forged);

    expect(items.map((m) => m.id)).not.toContain(privateOne);
    expect(items).toHaveLength(5);
  });
});
