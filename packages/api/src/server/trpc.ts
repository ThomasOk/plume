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
  SpaceNotFoundError,
  InvitationNotFoundError,
  InvitationExpiredError,
  AlreadyMemberError,
  MemberNotFoundError,
  LastAdminError,
} from './shared/errors';
export type { StorageService };

export interface AppLogger {
  info(obj: object | string, msg?: string): void;
  error(obj: object | string, msg?: string): void;
  debug(obj: object | string, msg?: string): void;
}

export const createTRPCContext = async ({
  auth,
  db,
  storage,
  headers,
  requestId,
  logger,
  invitationSecret,
}: {
  auth: AuthInstance;
  db: DatabaseInstance;
  storage: StorageService;
  headers: Headers;
  requestId: string;
  logger: AppLogger;
  invitationSecret: string;
}): Promise<{
  db: DatabaseInstance;
  storage: StorageService;
  session: AuthInstance['$Infer']['Session'] | null;
  requestId: string;
  logger: AppLogger;
  // Derives the token of an invitation link (see `invitation-token.ts`).
  invitationSecret: string;
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
    invitationSecret,
  };
};

export const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: SuperJSON,
});

export const router = t.router;

// Domain errors, as the client sees them. Anything not listed here is unexpected.
const domainErrorCodes: [new (...args: never[]) => Error, TRPCError['code']][] = [
  [MemoNotFoundError, 'NOT_FOUND'],
  [InsufficientPermissionsError, 'FORBIDDEN'],
  [AttachmentNotFoundError, 'NOT_FOUND'],
  [NotificationNotFoundError, 'NOT_FOUND'],
  [SpaceNotFoundError, 'NOT_FOUND'],
  [FileSizeLimitExceededError, 'BAD_REQUEST'],
  [InvitationNotFoundError, 'NOT_FOUND'],
  [InvitationExpiredError, 'PRECONDITION_FAILED'],
  [AlreadyMemberError, 'CONFLICT'],
  [MemberNotFoundError, 'NOT_FOUND'],
  [LastAdminError, 'CONFLICT'],
];

// tRPC's `next()` never throws: a failure further down comes back as `{ ok: false }`, with
// anything that was not a TRPCError wrapped into an INTERNAL_SERVER_ERROR whose `cause` is
// the original. So the translation reads the result instead of catching.
const errorMiddleware = t.middleware(async ({ ctx, next }) => {
  const result = await next();
  if (result.ok) return result;

  const { error } = result;
  for (const [ErrorClass, code] of domainErrorCodes) {
    if (error.cause instanceof ErrorClass) {
      throw new TRPCError({ code, message: error.cause.message, cause: error.cause });
    }
  }
  if (error.code !== 'INTERNAL_SERVER_ERROR') return result;

  ctx.logger.error(
    { requestId: ctx.requestId, err: error.cause ?? error },
    'Unexpected error',
  );
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
});

const timingMiddleware = t.middleware(async ({ ctx, next, path }) => {
  const start = Date.now();
  if (t._config.isDev && process.env.NODE_ENV !== 'test') {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  let ok = false;
  try {
    const result = await next();
    ok = result.ok;
    return result;
  } finally {
    ctx.logger.info({
      requestId: ctx.requestId,
      procedure: path,
      userId: ctx.session?.user.id ?? null,
      durationMs: Date.now() - start,
      ok,
    });
  }
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
