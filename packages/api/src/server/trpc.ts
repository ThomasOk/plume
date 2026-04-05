import { initTRPC, TRPCError } from '@trpc/server';
import SuperJSON from 'superjson';
import type { StorageService } from './shared/storage';
import type { AuthInstance } from '@repo/auth/server';
import type { DatabaseInstance } from '@repo/db/client';
import {
  MemoNotFoundError,
  InsufficientPermissionsError,
  AttachmentNotFoundError,
  NotificationNotFoundError,
  FileSizeLimitExceededError,
} from './shared/errors';
export type { StorageService };

export interface AppLogger {
  info(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
  debug(obj: object, msg?: string): void;
}

export const createTRPCContext = async ({
  auth,
  db,
  storage,
  headers,
  requestId,
  logger,
}: {
  auth: AuthInstance;
  db: DatabaseInstance;
  storage: StorageService;
  headers: Headers;
  requestId: string;
  logger: AppLogger;
}): Promise<{
  db: DatabaseInstance;
  storage: StorageService;
  session: AuthInstance['$Infer']['Session'] | null;
  requestId: string;
  logger: AppLogger;
}> => {
  const session = await auth.api.getSession({
    headers,
  });
  return {
    db,
    storage,
    session,
    requestId,
    logger,
  };
};

export const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: SuperJSON,
});

export const router = t.router;

const errorMiddleware = t.middleware(async ({ ctx, next }) => {
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
    if (error instanceof AttachmentNotFoundError) {
      throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
    }
    if (error instanceof NotificationNotFoundError) {
      throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
    }
    if (error instanceof FileSizeLimitExceededError) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
    }
    ctx.logger.error(
      { requestId: ctx.requestId, err: error },
      'Unexpected error',
    );
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

const timingMiddleware = t.middleware(async ({ ctx, next, path }) => {
  const start = Date.now();
  if (t._config.isDev && process.env.NODE_ENV !== 'test') {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  const result = await next();
  const durationMs = Date.now() - start;

  ctx.logger.info({
    requestId: ctx.requestId,
    procedure: path,
    userId: ctx.session?.user.id ?? null,
    durationMs,
    ok: result.ok,
  });

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
