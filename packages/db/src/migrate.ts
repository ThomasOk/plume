import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { DatabaseInstance } from './client';

/**
 * Applies the migrations in `migrationsFolder` that the database has not recorded yet.
 *
 * The runtime counterpart of `drizzle-kit migrate`, for where drizzle-kit is not installed
 * (the production image). Both read and write the same `drizzle.__drizzle_migrations` table,
 * so a database migrated by one is up to date for the other.
 */
export const runMigrations = (db: DatabaseInstance, migrationsFolder: string) =>
  migrate(db, { migrationsFolder });
