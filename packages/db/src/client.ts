import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from './schema';

export interface DatabaseClientOptions {
  databaseUrl?: string;
  max?: number;
}

export type DatabaseInstance = NodePgDatabase<typeof schema> & {
  $client: Pool;
};

export const createDb = (opts?: DatabaseClientOptions): DatabaseInstance => {
  return drizzle({
    schema,
    casing: 'snake_case',
    connection: {
      connectionString: opts?.databaseUrl,
      max: opts?.max,
    },
  });
};
