import type { AppLogger, StorageService } from './trpc';
import type { AuthInstance } from '@repo/auth/server';
import type { DatabaseInstance } from '@repo/db/client';
import { attachmentsRouter } from './features/attachments';
import { memosRouter } from './features/memos';
import { notificationsRouter } from './features/notifications';
import { usersRouter } from './features/users';
import { createTRPCContext as createTRPCContextInternal, router } from './trpc';

export const appRouter = router({
  memos: memosRouter,
  attachments: attachmentsRouter,
  notifications: notificationsRouter,
  users: usersRouter,
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

export type AppRouter = typeof appRouter;
export type { AppLogger, StorageService };
