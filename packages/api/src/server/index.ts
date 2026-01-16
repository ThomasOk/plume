import type { AuthInstance } from '@repo/auth/server';
import type { DatabaseInstance } from '@repo/db/client';
import { memosRouter } from './features/memos';
import { createTRPCContext as createTRPCContextInternal, router } from './trpc';

export const appRouter = router({
  memos: memosRouter,
});

export const createApi = ({
  auth,
  db,
}: {
  auth: AuthInstance;
  db: DatabaseInstance;
}) => {
  return {
    trpcRouter: appRouter,
    createTRPCContext: ({ headers }: { headers: Headers }) =>
      createTRPCContextInternal({ auth, db, headers }),
  };
};

export type AppRouter = typeof appRouter;
