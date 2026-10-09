import type { AppLogger, StorageService } from './trpc';
import type { AuthInstance } from '@repo/auth/server';
import type { DatabaseInstance } from '@repo/db/client';
import { accountRouter } from './features/account';
import { attachmentsRouter } from './features/attachments';
import { invitationsRouter } from './features/invitations';
import { memosRouter } from './features/memos';
import { notificationsRouter } from './features/notifications';
import { preferencesRouter } from './features/preferences';
import { spacesRouter } from './features/spaces';
import { createTRPCContext as createTRPCContextInternal, router } from './trpc';

export const appRouter = router({
  memos: memosRouter,
  attachments: attachmentsRouter,
  notifications: notificationsRouter,
  spaces: spacesRouter,
  invitations: invitationsRouter,
  preferences: preferencesRouter,
  account: accountRouter,
});

export const createApi = ({
  auth,
  db,
  storage,
  invitationSecret,
}: {
  auth: AuthInstance;
  db: DatabaseInstance;
  storage: StorageService;
  invitationSecret: string;
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
    }) => createTRPCContextInternal({
        auth,
        db,
        storage,
        headers,
        requestId,
        logger,
        invitationSecret,
      }),
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
export {
  deriveInvitationToken,
  type InvitationLinkConfig,
} from './features/invitations/invitation-token';

// The memo export, outside tRPC because tRPC does not return binary bodies: the deployable
// server serves it as a plain HTTP download.
export { buildMemoArchive } from './features/export/memo-archive';

// The showcase featured on Explore, written by a command run against the database, as the
// operator role is granted (ADR 0007).
export {
  seedShowcase,
  ShowcaseRefusedError,
  type Showcase,
  type ShowcaseMemo,
  type SeededMemo,
} from './features/showcase/seed-showcase';

export type AppRouter = typeof appRouter;
export type { AppLogger, StorageService };
