import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import {
  createApi,
  createEventBusWithHandlers,
  createNoopEmailSender,
  createResendEmailSender,
  startOutboxWorker,
  type EmailSender,
} from '@repo/api/server';
import { createAuth } from '@repo/auth/server';
import { createDb } from '@repo/db/client';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env';
import { logger } from './lib/logger';
import * as storage from './lib/storage';

const trustedOrigins = [env.PUBLIC_WEB_URL].map((url) => new URL(url).origin);

const wildcardPath = {
  ALL: '*',
  BETTER_AUTH: '/api/auth/*',
  TRPC: '/trpc/*',
} as const;

const db = createDb({ databaseUrl: env.SERVER_POSTGRES_URL });

const auth = createAuth({
  authSecret: env.SERVER_AUTH_SECRET,
  db,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.PUBLIC_WEB_URL],
  google:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        }
      : undefined,
});
const api = createApi({ auth, db, storage });

// Outbox pipeline, composed once at boot (never on import, so tests never start the worker).
// Resend drives the email reaction when a key is configured; without one we fall back to a
// no-op sender (see its adapter for why) and warn loudly here so the operator knows email is
// off — the rest of the pipeline, notifications included, is unaffected.
let emailSender: EmailSender;
if (env.RESEND_API_KEY) {
  emailSender = createResendEmailSender({
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM_EMAIL,
  });
} else {
  logger.warn(
    'RESEND_API_KEY not set — comment emails are disabled; notifications are still persisted',
  );
  emailSender = createNoopEmailSender((message) => logger.debug(message));
}
const eventBus = createEventBusWithHandlers(db, emailSender);
const outboxWorker = startOutboxWorker({
  db,
  bus: eventBus,
  onError: (error) => logger.error({ err: error }, 'Outbox drain failed'),
});

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
    requestId: string;
  };
}>();

app.get('/healthcheck', (c) => {
  return c.text('OK');
});

app.use(async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  await next();
});

app.use(async (c, next) => {
  const start = Date.now();
  await next();
  logger.info({
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - start,
  });
});

app.use(
  wildcardPath.BETTER_AUTH,
  cors({
    origin: trustedOrigins,
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
  }),
);

app.use(
  wildcardPath.TRPC,
  cors({
    origin: trustedOrigins,
    credentials: true,
  }),
);

app.on(['POST', 'GET'], wildcardPath.BETTER_AUTH, (c) =>
  auth.handler(c.req.raw),
);

app.use(
  wildcardPath.TRPC,
  trpcServer({
    router: api.trpcRouter,
    createContext: (opts, c) =>
      api.createTRPCContext({
        headers: opts.req.headers,
        requestId: c.var.requestId,
        logger,
      }),
  }),
);

app.get('/', (c) => {
  return c.json({ name: 'plume-api', status: 'ok' });
});

const server = serve(
  {
    fetch: app.fetch,
    port: env.SERVER_PORT,
    hostname: env.SERVER_HOST,
  },
  (info) => {
    const host = info.family === 'IPv6' ? `[${info.address}]` : info.address;
    logger.info({ host, port: info.port }, 'Server started');
  },
);

// Railway sends SIGTERM on redeploy. Stop the outbox worker first — clearing its interval and
// letting any in-flight drain finish so a delivery is never cut off mid-flight — then close
// the HTTP server. Guarded so a second signal during shutdown is ignored rather than racing.
let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;

  await outboxWorker.stop();

  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'Error during shutdown');
    } else {
      logger.info('Server stopped gracefully');
    }
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
