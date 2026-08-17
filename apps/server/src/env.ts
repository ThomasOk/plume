import { z } from 'zod';

const DEFAULT_SERVER_PORT = 3035;
const DEFAULT_SERVER_HOST = 'localhost';

const createPortSchema = ({ defaultPort }: { defaultPort: number }) =>
  z
    .string()
    .default(`${defaultPort}`)
    .transform((s) => parseInt(s, 10))
    .pipe(z.number().int().min(0).max(65535));

export const envSchema = z.object({
  SERVER_PORT: createPortSchema({ defaultPort: DEFAULT_SERVER_PORT }),
  SERVER_HOST: z.string().min(1).default(DEFAULT_SERVER_HOST),
  SERVER_AUTH_SECRET: z.string().min(1),
  SERVER_POSTGRES_URL: z.string(),
  PUBLIC_WEB_URL: z.url(),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  // Cloudflare R2
  SERVER_R2_ACCOUNT_ID: z.string().min(1),
  SERVER_R2_ACCESS_KEY_ID: z.string().min(1),
  SERVER_R2_SECRET_ACCESS_KEY: z.string().min(1),
  SERVER_R2_BUCKET_NAME: z.string().min(1),
  SERVER_R2_PUBLIC_URL: z.url(),
  SERVER_R2_UPLOAD_SIZE_LIMIT_MB: z.string().default('30').transform(Number),
  // Resend (comment-email reaction). Optional so the app boots without email configured;
  // the outbox worker (ticket 04) wires the real sender only when a key is present.
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.email().default('onboarding@resend.dev'),
  // Display name shown as the sender in mail clients (Gmail shows this, not the address).
  // Composed with RESEND_FROM_EMAIL into a `Name <email>` From header at boot.
  RESEND_FROM_NAME: z.string().min(1).default('Plume'),
});

export const env = envSchema.parse(process.env);
