import { z } from 'zod';

export const CLIENT_ENV_PREFIX = 'PUBLIC_';

export const envSchema = z.object({
  PUBLIC_SERVER_URL: z.url(),
  PUBLIC_WEB_URL: z.url(),
  PUBLIC_BASE_PATH: z.string().startsWith('/').default('/'),
});

export const env = envSchema.parse(import.meta.env);
