import { fileURLToPath } from 'node:url';
import { createDb } from '@repo/db/client';
import { runMigrations } from '@repo/db/migrate';
import { z } from 'zod';
import { logger } from './lib/logger';

// Railway's pre-deploy command: `node /app/dist/migrate.js`. It runs once per deployment,
// after the build and before the new version takes traffic; a failure aborts the deployment
// and leaves the previous version serving. Migrating at boot instead would run on every
// restart and replica, and a failing migration would crash-loop the server.
//
// The old version keeps serving while this runs, against the new schema: migrations must
// stay backward compatible (add, then remove in a later deployment). See ADR 0005.
//
// Only the database URL is read, not the whole server env: migrating needs nothing else.
const databaseUrl = z.string().min(1).parse(process.env.SERVER_POSTGRES_URL);

// The build copies `packages/db/drizzle` next to this file (see tsup.config.ts).
const migrationsFolder = fileURLToPath(new URL('./drizzle', import.meta.url));

const db = createDb({ databaseUrl, max: 1 });

try {
  logger.info({ migrationsFolder }, 'applying migrations');
  await runMigrations(db, migrationsFolder);
  logger.info('migrations applied');
} catch (error) {
  logger.error({ err: error }, 'migration failed');
  process.exitCode = 1;
} finally {
  await db.$client.end();
}
