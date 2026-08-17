import type { AppLogger, StorageService } from './trpc';
import type { AuthInstance } from '@repo/auth/server';
import type { DatabaseInstance } from '@repo/db/client';
import { attachmentsRouter } from './features/attachments';
import { memosRouter } from './features/memos';
import { notificationsRouter } from './features/notifications';
import { createTRPCContext as createTRPCContextInternal, router } from './trpc';

export const appRouter = router({
  memos: memosRouter,
  attachments: attachmentsRouter,
  notifications: notificationsRouter,
});

export const createApi = ({
  auth,
  db,
  storage,
}: {
  auth: AuthInstance;
  db: DatabaseInstance;
  storage: StorageService;
}) => {
  return {
    trpcRouter: appRouter,
    createTRPCContext: ({
      headers,
      requestId,
      logger,
    }: {
      headers: Headers;
      requestId: string;
      logger: AppLogger;
    }) => createTRPCContextInternal({ auth, db, storage, headers, requestId, logger }),
  };
};

// Outbox pipeline wiring, exported for the deployable server to compose at boot. Kept out of
// `createApi` on purpose: importing the package must never start the polling worker, so tests
// that import `@repo/api/server` stay free of a running interval.
export { createEventBusWithHandlers } from './events/register-handlers';
export { startOutboxWorker, type OutboxWorker } from './events/worker';
export { createResendEmailSender } from './email/resend-email-sender';
export { createNoopEmailSender } from './email/noop-email-sender';
export type { EmailSender } from './email/email-sender';

export type AppRouter = typeof appRouter;
export type { AppLogger, StorageService };
