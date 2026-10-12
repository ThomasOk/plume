import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { createDb, type DatabaseInstance } from '@repo/db';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import SuperJSON from 'superjson';
import type { AppLogger, StorageService } from '../src/server/trpc';
import { appRouter } from '../src/server/index';
import { DATA_SET, SPACE_ID, WRITER_ID, seedLists } from './seed-lists';

/**
 * `pnpm bench:lists`: what each memo list costs on a large data set: its response size,
 * its time (median and p95) and how Postgres executes its query. A tool, not a test: it
 * asserts nothing, and timing noise never fails a build. Results go in
 * `docs/performance/memo-lists.md`.
 *
 * It starts its own Postgres through Testcontainers and reads no connection string, so it
 * cannot touch a database it did not start.
 */

// Outside production, every procedure waits a random 100 to 500 ms to mimic latency in
// development (see `timingMiddleware`), which would bury a page that takes milliseconds.
// tRPC reads `NODE_ENV` when the router is built, so the script sets it before anything runs.
if (process.env.NODE_ENV !== 'production') {
  console.error('Run it as `pnpm bench:lists`, with NODE_ENV=production: development delays every call.');
  process.exit(1);
}

const WARMUP_RUNS = 3;
const MEASURED_RUNS = 30;

const migrationsFolder = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../db/drizzle');

const silentLogger: AppLogger = { info: () => {}, error: () => {}, debug: () => {} };

// Attachments carry their public URL, so the size counts one of realistic length.
const storage: StorageService = {
  generateUploadUrl: async () => ({ url: '', contentDisposition: '' }),
  getPublicUrl: (key) => `https://attachments.plume.example.com/${key}`,
  deleteObject: async () => {},
};

const callerFor = (db: DatabaseInstance, userId: string | null) => {
  const now = new Date();
  return appRouter.createCaller({
    db,
    storage,
    requestId: 'bench',
    logger: silentLogger,
    invitationSecret: 'bench',
    session: userId
      ? {
          user: { id: userId, email: `${userId}@bench.example.com`, name: userId, emailVerified: true, createdAt: now, updatedAt: now, image: null, isOperator: false },
          session: { id: 'bench', userId, expiresAt: new Date(now.getTime() + 86400000), token: 'bench', createdAt: now, updatedAt: now, ipAddress: null, userAgent: null },
        }
      : null,
  });
};

// Every query a call sends, so the list query can be explained exactly as it was sent.
interface SentQuery {
  text: string;
  values: unknown[];
}

const recordQueries = (db: DatabaseInstance) => {
  const pool = db.$client;
  const query = pool.query.bind(pool) as (...args: unknown[]) => unknown;
  let sent: SentQuery[] | null = null;
  (pool as { query: unknown }).query = (...args: unknown[]) => {
    if (sent) {
      // `pg` takes the text alone or in a config, and the values in either, or beside it.
      const [first, second] = args;
      const values = Array.isArray(second) ? second : [];
      if (typeof first === 'string') sent.push({ text: first, values });
      else if (first && typeof first === 'object' && 'text' in first) {
        const config = first as { text: string; values?: unknown[] };
        sent.push({ text: config.text, values: config.values ?? values });
      }
    }
    return query(...args);
  };
  return async (call: () => Promise<unknown>) => {
    sent = [];
    try {
      await call();
      return sent;
    } finally {
      sent = null;
    }
  };
};

const percentile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]!;

interface ListUnderTest {
  name: string;
  reader: string;
  // One page of the list.
  call: () => Promise<{ items: unknown[] }>;
}

type Page = { nextCursor: string | null };

// The cursor of a list's page `page` (1 for the first), followed from the first page: a
// keyset seek should cost the same at any depth, which an offset would not.
const cursorAt = async (name: string, readPage: (cursor: string | undefined) => Promise<Page>, page: number) => {
  let cursor: string | undefined;
  for (let i = 1; i < page; i++) {
    const { nextCursor } = await readPage(cursor);
    if (!nextCursor) throw new Error(`${name} has fewer than ${page} pages`);
    cursor = nextCursor;
  }
  return cursor;
};

const DEEP_PAGE = 100;

async function main() {
  console.error('Starting a disposable Postgres…');
  const container = await new PostgreSqlContainer('postgres:17').start();
  const db = createDb({ databaseUrl: container.getConnectionUri() });

  try {
    await migrate(db, { migrationsFolder });
    console.error('Seeding…');
    const counts = await seedLists(db);
    const queriesOf = recordQueries(db);
    const readPersonal = (cursor: string | undefined) => callerFor(db, WRITER_ID).memos.list({ cursor });
    const readSpace = (cursor: string | undefined) => callerFor(db, WRITER_ID).memos.space.list({ spaceId: SPACE_ID, cursor });
    const readExplore = (cursor: string | undefined) => callerFor(db, null).memos.listPublic({ cursor });
    const deepPersonalCursor = await cursorAt('The personal scope', readPersonal, DEEP_PAGE);
    const deepSpaceCursor = await cursorAt('The space', readSpace, DEEP_PAGE);
    const deepExploreCursor = await cursorAt('Explore', readExplore, DEEP_PAGE);

    const lists: ListUnderTest[] = [
      { name: 'Personal scope', reader: 'the writer', call: () => readPersonal(undefined) },
      { name: `Personal scope, page ${DEEP_PAGE}`, reader: 'the writer', call: () => readPersonal(deepPersonalCursor) },
      { name: 'Space', reader: 'a member (the writer)', call: () => readSpace(undefined) },
      { name: `Space, page ${DEEP_PAGE}`, reader: 'a member (the writer)', call: () => readSpace(deepSpaceCursor) },
      { name: 'Explore', reader: 'an anonymous visitor', call: () => readExplore(undefined) },
      { name: `Explore, page ${DEEP_PAGE}`, reader: 'an anonymous visitor', call: () => readExplore(deepExploreCursor) },
    ];

    const results = [];
    for (const list of lists) {
      console.error(`Measuring ${list.name}…`);
      for (let i = 0; i < WARMUP_RUNS; i++) await list.call();

      const times: number[] = [];
      let result: { items: unknown[] } = { items: [] };
      for (let i = 0; i < MEASURED_RUNS; i++) {
        const start = performance.now();
        result = await list.call();
        times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b);

      // What crosses the wire: the procedure's result, serialized as tRPC sends it.
      const bytes = Buffer.byteLength(SuperJSON.stringify(result));

      // The list query is the one that counts comments; the others fetch the attachments
      // and reactions of its rows, by identifier.
      const sent = await queriesOf(list.call);
      const listQuery = sent.find((q) => q.text.includes('comment_count'));
      if (!listQuery) throw new Error(`No list query recorded for ${list.name}`);
      const plan = await db.$client.query<{ 'QUERY PLAN': string }>(`EXPLAIN (ANALYZE, BUFFERS) ${listQuery.text}`, listQuery.values);

      results.push({
        ...list,
        rows: result.items.length,
        bytes,
        median: percentile(times, 50),
        p95: percentile(times, 95),
        queries: sent.length,
        sql: listQuery.text,
        plan: plan.rows.map((r) => r['QUERY PLAN']).join('\n'),
      });
    }

    const { rows: [version] } = await db.$client.query<{ server_version: string }>('SHOW server_version');
    const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;
    const ms = (value: number) => `${value.toFixed(1)} ms`;

    const out = [
      '## Run',
      '',
      `- Machine: ${os.cpus()[0]?.model ?? 'unknown CPU'}, ${os.cpus().length} cores, ${(os.totalmem() / 2 ** 30).toFixed(0)} GB, ${os.type()} ${os.release()} (${os.arch()})`,
      `- Node ${process.version}, PostgreSQL ${version?.server_version} (Testcontainers, default configuration)`,
      `- ${WARMUP_RUNS} warm-up calls, then ${MEASURED_RUNS} measured calls per list`,
      '',
      '## Data set',
      '',
      `- ${counts.users} users, ${counts.rootMemos} root memos, ${counts.comments} comments, ${counts.reactions} reactions, ${counts.attachments} attachments`,
      `- Personal scope: ${DATA_SET.personalMemos} memos (${DATA_SET.personalPublicShare * 100}% public), ${DATA_SET.personalPins} pinned`,
      `- Space: ${DATA_SET.spaceMemos} memos by ${DATA_SET.spaceMembers} members, ${DATA_SET.spacePins} pinned`,
      `- Explore: ${DATA_SET.publicMemos} memos by ${DATA_SET.publicAuthors} authors plus the writer's public memos, ${DATA_SET.featured} featured`,
      '',
      '## Results',
      '',
      '| List | Reader | Memos returned | Response size | Median | p95 | Queries |',
      '| ---- | ------ | -------------: | ------------: | -----: | --: | ------: |',
      ...results.map((r) => `| ${r.name} | ${r.reader} | ${r.rows} | ${kb(r.bytes)} | ${ms(r.median)} | ${ms(r.p95)} | ${r.queries} |`),
      '',
      '## Query plans',
      ...results.flatMap((r) => ['', `### ${r.name}`, '', '```sql', r.sql, '```', '', '```', r.plan, '```']),
    ];
    console.log(out.join('\n'));
  } finally {
    await db.$client.end();
    await container.stop();
  }
}

await main();
