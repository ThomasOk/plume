import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { seedShowcase } from '@repo/api/server';
import { createDb } from '@repo/db/client';
import { z } from 'zod';
import { buildShowcase } from './showcase/showcase';

// Writes the showcase memos and features them on Explore. In production, from a shell on the
// server service: `node /app/dist/seed-showcase.js <author-id> <reader-id> <reader-id>`.
// The author must be an operator; the readers are accounts created through sign-up. Running
// it again updates the texts in place and creates nothing new.
//
// Plain lines on stdout, as the operator commands: a person reads what changed.
const [author, firstReader, secondReader] = process.argv.slice(2);
if (!author || !firstReader || !secondReader) {
  const command = basename(process.argv[1] ?? 'seed-showcase');
  console.error(
    `Usage: ${command} <author-id> <first-reader-id> <second-reader-id> (user identifiers, never emails)`,
  );
  process.exit(1);
}

// The texts sit in `showcase/` beside this file: in `src` when run with tsx, in `dist` once
// built, where the build copies them (see tsup.config.ts).
const read = (file: string) =>
  readFileSync(new URL(`./showcase/${file}`, import.meta.url), 'utf8');

const databaseUrl = z.string().min(1).parse(process.env.SERVER_POSTGRES_URL);
const db = createDb({ databaseUrl, max: 1 });

try {
  const seeded = await seedShowcase(
    db,
    buildShowcase({ author, firstReader, secondReader }, read),
  );
  for (const { id, title, outcome } of seeded)
    console.log(`${outcome.padEnd(9)} ${id}  ${title}`);
  console.log(`${seeded.length} memos featured on Explore, in this order.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await db.$client.end();
}
