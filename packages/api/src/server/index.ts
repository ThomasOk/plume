import type { AuthInstance } from '@repo/auth/server';
import type { DatabaseInstance } from '@repo/db/client';
import { memosRouter } from './features/memos';
import { attachmentsRouter } from './features/attachments';
import { createTRPCContext as createTRPCContextInternal, router } from './trpc';
import type { StorageService } from './trpc';

export const appRouter = router({
  memos: memosRouter,
  attachments: attachmentsRouter,
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
    createTRPCContext: ({ headers }: { headers: Headers }) =>
      createTRPCContextInternal({ auth, db, storage, headers }),
  };
};

export type AppRouter = typeof appRouter;
export type { StorageService };
