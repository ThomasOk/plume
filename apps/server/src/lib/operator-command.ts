import { basename } from 'node:path';
import { createDb, type DatabaseInstance } from '@repo/db/client';
import { z } from 'zod';
import type { ChangedUser } from '@repo/auth/operator';

// The shell shared by `grant-operator` and `revoke-operator`: read the user identifier,
// change the flag, print the user it changed. The behaviour lives in `@repo/auth/operator`.
// Only the database URL is read, as in `migrate.ts`: making an operator needs nothing else.
//
// Plain lines on stdout and stderr rather than the pino logger: a person reads this output
// to check the name and email before trusting the change, and a JSON record hides them.
export const runOperatorCommand = async (
  change: (db: DatabaseInstance, userId: string) => Promise<ChangedUser>,
  outcome: string,
) => {
  const userId = process.argv[2];
  if (!userId) {
    const command = basename(process.argv[1] ?? 'operator-command');
    console.error(
      `Usage: ${command} <user-id> (the user identifier, never an email)`,
    );
    process.exitCode = 1;
    return;
  }

  const databaseUrl = z.string().min(1).parse(process.env.SERVER_POSTGRES_URL);
  const db = createDb({ databaseUrl, max: 1 });

  try {
    const changed = await change(db, userId);
    console.log(`${changed.name} <${changed.email}> (${userId}) ${outcome}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await db.$client.end();
  }
};
