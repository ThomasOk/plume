import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, type DatabaseInstance } from '@repo/db';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const migrationsFolder = path.resolve(__dirname, '../../../db/drizzle');

let container: StartedPostgreSqlContainer;
let db: DatabaseInstance;

export const startTestDatabase = async (): Promise<DatabaseInstance> => {
  // Same major as compose.yaml pins and as local dev runs, so a constraint or a cast
  // that behaves differently between majors cannot pass here and fail there.
  container = await new PostgreSqlContainer('postgres:17').start();
  db = createDb({ databaseUrl: container.getConnectionUri() });
  await migrate(db, { migrationsFolder });
  return db;
};

export const stopTestDatabase = async (): Promise<void> => {
  await db.$client.end();
  await container.stop();
};
