import { initTRPC, TRPCError } from '@trpc/server';
import SuperJSON from 'superjson';
import type { AuthInstance } from '@repo/auth/server';
import type { DatabaseInstance } from '@repo/db/client';
import { MemoNotFoundError, InsufficientPermissionsError } from './lib/errors';

export interface StorageService {
  generateUploadUrl(key: string, mimeType: string, filename: string): Promise<{ url: string; contentDisposition: string }>;
  getPublicUrl(key: string): string;
  deleteObject(key: string): Promise<void>;
}

export const createTRPCContext = async ({
  auth,
  db,
  storage,
  headers,
}: {
  auth: AuthInstance;
  db: DatabaseInstance;
  storage: StorageService;
  headers: Headers;
}): Promise<{
  db: DatabaseInstance;
  storage: StorageService;
  session: AuthInstance['$Infer']['Session'] | null;
}> => {
  const session = await auth.api.getSession({
    headers,
  });
  return {
    db,
    storage,
    session,
  };
};

export const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: SuperJSON,
});

export const router = t.router;

const errorMiddleware = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    if (error instanceof MemoNotFoundError) {
      throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
    }
    if (error instanceof InsufficientPermissionsError) {
      throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
    }
    console.error('[TRPC] Unexpected error:', error);
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  let waitMsDisplay = '';
  if (t._config.isDev && process.env.NODE_ENV !== 'test') {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    waitMsDisplay = ` (artificial delay: ${waitMs}ms)`;
  }
  const result = await next();
  const end = Date.now();

  console.log(
    `\t[TRPC] /${path} executed after ${end - start}ms${waitMsDisplay}`,
  );
  return result;
});

export const publicProcedure = t.procedure.use(errorMiddleware).use(timingMiddleware);

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({
    ctx: {
      session: { ...ctx.session },
    },
  });
});
