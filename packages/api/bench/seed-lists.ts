import { attachment, memo, reaction, space, spaceMember, user, type DatabaseInstance } from '@repo/db';
import { REACTION_EMOJIS } from '../src/server/features/memos/memos-schemas';
import { extractTagsFromContent } from '../src/server/features/memos/memos-utils';

/**
 * A data set large enough to show what the memo lists cost: a writer with years of personal
 * memos, a busy space, and an Explore fed by many authors, with what a list carries along
 * (tags, attachments, reactions, comments) and its curation (a few pins, a few featured).
 *
 * Deterministic: identifiers come from counters, dates from a fixed instant, and every
 * choice from a seeded generator, so two runs measure the same rows.
 *
 * Raw bulk inserts, not the memo services the showcase goes through: one service call per
 * row would take minutes for some 30,000 memos. The invariants the services keep hold by
 * construction here, and the CHECK constraints on `memo` refuse a row that breaks them.
 */

export const DATA_SET = {
  personalMemos: 2000,
  // Of the writer's personal memos, the share that is public, and so on Explore too.
  personalPublicShare: 0.2,
  personalPins: 5,
  spaceMembers: 20,
  spaceMemos: 2000,
  spacePins: 3,
  publicAuthors: 200,
  publicMemos: 10000,
  featured: 6,
  maxCommentsPerMemo: 3,
  maxReactionsPerMemo: 5,
  attachmentShare: 0.1,
} as const;

// The readers the benchmark calls each list as.
export const WRITER_ID = 'bench-writer';
export const SPACE_ID = 'bench-space';

// Every date is before this instant, and none reads the clock.
const NOW = Date.UTC(2026, 0, 1);
const MINUTE = 60_000;
const SPAN = 2 * 365 * 24 * 60 * MINUTE;

// mulberry32: small, fast and seedable, which `Math.random` is not.
const seededRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const WORDS = (
  'idea draft meeting recipe book garden travel budget project review release bug fix design ' +
  'coffee morning evening weekend plan list note thought question answer reading writing music ' +
  'walk train city river mountain market client deadline sketch prototype lesson habit sleep'
).split(' ');
const TAGS = [
  'work', 'work/meetings', 'work/projects', 'personal', 'reading', 'cooking', 'cooking/italian',
  'travel', 'ideas', 'health', 'music', 'dev', 'dev/typescript', 'dev/postgres', 'journal',
];

type MemoRow = typeof memo.$inferInsert;

const pad = (n: number, width = 5) => String(n).padStart(width, '0');

async function insertInChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  // Well under Postgres' 65,535 bind parameters for a dozen columns a row.
  for (let i = 0; i < rows.length; i += 1000) await insert(rows.slice(i, i + 1000));
}

export interface SeededCounts {
  users: number;
  rootMemos: number;
  comments: number;
  reactions: number;
  attachments: number;
}

export async function seedLists(db: DatabaseInstance): Promise<SeededCounts> {
  const random = seededRandom(20260101);
  const int = (max: number) => Math.floor(random() * max);
  const pick = <T>(items: readonly T[]) => items[int(items.length)]!;
  const pickDistinct = <T>(items: readonly T[], count: number) => {
    const chosen = new Set<T>();
    while (chosen.size < Math.min(count, items.length)) chosen.add(pick(items));
    return [...chosen];
  };

  const content = () => {
    const sentences = 1 + int(5);
    const lines: string[] = [];
    for (let s = 0; s < sentences; s++) {
      const words = Array.from({ length: 6 + int(14) }, () => pick(WORDS));
      lines.push(`${words.join(' ')}.`);
    }
    const hashtags = pickDistinct(TAGS, int(3)).map((t) => `#${t}`);
    return [...lines, hashtags.join(' ')].join('\n').trim();
  };

  // Users: the writer, the other members of the space, and the authors of Explore.
  const at = new Date(NOW - SPAN);
  const userRow = (id: string, name: string) => ({
    id, name, email: `${id}@bench.example.com`, emailVerified: true, image: null, createdAt: at, updatedAt: at,
  });
  const members = [WRITER_ID, ...Array.from({ length: DATA_SET.spaceMembers - 1 }, (_, i) => `bench-member-${pad(i + 1, 2)}`)];
  const authors = Array.from({ length: DATA_SET.publicAuthors }, (_, i) => `bench-author-${pad(i + 1, 3)}`);
  const everyone = [...members, ...authors];
  await db.insert(user).values([
    userRow(WRITER_ID, 'Writer'),
    ...members.slice(1).map((id, i) => userRow(id, `Member ${i + 1}`)),
    ...authors.map((id, i) => userRow(id, `Author ${i + 1}`)),
  ]);

  await db.insert(space).values({ id: SPACE_ID, title: 'Busy space', createdAt: at, updatedAt: at });
  await db.insert(spaceMember).values(
    members.map((userId, i) => ({ spaceId: SPACE_ID, userId, role: i === 0 ? ('admin' as const) : ('member' as const), joinedAt: at })),
  );

  // Root memos, with who may comment on and react to each: only who can read it.
  let memoCount = 0;
  const roots: { row: MemoRow; readers: readonly string[] }[] = [];
  const addRootMemo = (userId: string, visibility: MemoRow['visibility'], readers: readonly string[]) => {
    const text = content();
    const createdAt = new Date(NOW - int(SPAN));
    const row: MemoRow = {
      id: `bench-memo-${pad(++memoCount)}`,
      userId,
      content: text,
      tags: extractTagsFromContent(text),
      visibility,
      spaceId: visibility === 'space' ? SPACE_ID : null,
      createdAt,
      updatedAt: createdAt,
    };
    roots.push({ row, readers });
    return row;
  };

  const personal = Array.from({ length: DATA_SET.personalMemos }, () =>
    random() < DATA_SET.personalPublicShare ? addRootMemo(WRITER_ID, 'public', everyone) : addRootMemo(WRITER_ID, 'private', [WRITER_ID]),
  );
  const inSpace = Array.from({ length: DATA_SET.spaceMemos }, () => addRootMemo(pick(members), 'space', members));
  const onExplore = Array.from({ length: DATA_SET.publicMemos }, () => addRootMemo(pick(authors), 'public', everyone));

  // Curation, the latest decision first: a few pins in each scope, a few featured on Explore.
  personal.slice(0, DATA_SET.personalPins).forEach((m, i) => (m.pinnedAt = new Date(NOW - (i + 1) * MINUTE)));
  inSpace.slice(0, DATA_SET.spacePins).forEach((m, i) => (m.pinnedAt = new Date(NOW - (i + 1) * MINUTE)));
  onExplore.slice(0, DATA_SET.featured).forEach((m, i) => (m.featuredAt = new Date(NOW - (i + 1) * MINUTE)));

  // Comments share their memo's visibility and space (ADR 0001), and come after it.
  const comments: MemoRow[] = [];
  for (const { row, readers } of roots) {
    for (let c = int(DATA_SET.maxCommentsPerMemo + 1); c > 0; c--) {
      const createdAt = new Date(row.createdAt.getTime() + 1 + int(7 * 24 * 60 * MINUTE));
      comments.push({
        id: `bench-comment-${pad(comments.length + 1)}`,
        userId: pick(readers),
        parentId: row.id,
        content: content(),
        tags: [],
        visibility: row.visibility,
        spaceId: row.spaceId,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  const reactions = roots.flatMap(({ row, readers }) =>
    pickDistinct(readers, int(DATA_SET.maxReactionsPerMemo + 1)).map((userId, i) => ({
      id: `bench-reaction-${row.id}-${i}`,
      memoId: row.id,
      userId,
      emoji: pick(REACTION_EMOJIS),
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
    })),
  );

  const attachments = roots
    .filter(() => random() < DATA_SET.attachmentShare)
    .flatMap(({ row }) =>
      Array.from({ length: 1 + int(2) }, (_, i) => ({
        id: `bench-attachment-${row.id}-${i}`,
        userId: row.userId,
        memoId: row.id,
        status: 'active' as const,
        filename: `photo-${i + 1}.jpg`,
        storageKey: `attachments/${row.userId}/${row.id}-${i}.jpg`,
        mimeType: 'image/jpeg',
        size: 50_000 + int(2_000_000),
        createdAt: row.createdAt,
        updatedAt: row.createdAt,
      })),
    );

  await insertInChunks(roots.map((r) => r.row), (chunk) => db.insert(memo).values(chunk));
  await insertInChunks(comments, (chunk) => db.insert(memo).values(chunk));
  await insertInChunks(reactions, (chunk) => db.insert(reaction).values(chunk));
  await insertInChunks(attachments, (chunk) => db.insert(attachment).values(chunk));
  // Fresh statistics, as autovacuum would eventually gather them, so the planner sees the
  // data set it is about to read rather than empty tables.
  await db.$client.query('ANALYZE');

  return {
    users: everyone.length,
    rootMemos: roots.length,
    comments: comments.length,
    reactions: reactions.length,
    attachments: attachments.length,
  };
}
