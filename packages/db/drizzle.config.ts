import { z } from 'zod';
import type { Config } from 'drizzle-kit';

const envSchema = z.object({
  DB_POSTGRES_URL: z.string().min(1),
});

const env = envSchema.parse(process.env);

const nonPoolingUrl = env.DB_POSTGRES_URL.replace(':6543', ':5432');

export default {
  schema: './src/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: nonPoolingUrl },
  casing: 'snake_case',
} satisfies Config;