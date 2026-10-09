import { protectedProcedure, publicProcedure, router } from '../../trpc';
import { spaceProcedure } from '../spaces';
import { personalScope, spaceScope } from './memo-scope';
import {
  createMemoSchema,
  createSpaceMemoSchema,
  updateMemoSchema,
  deleteMemoSchema,
  listMemosSchema,
  listCommentsSchema,
  getByIdSchema,
  moveSpaceMemoSchema,
  moveMemoSchema,
  pinMemoSchema,
  featureMemoSchema,
  reactSchema,
  unreactSchema,
} from './memos-schemas';
import {
  getMemoById,
  listMemos,
  listPublicMemos,
  createMemo,
  listMemoComments,
  updateMemo,
  deleteMemo as deleteMemoService,
  getMemoStats,
  getMemoTags,
  getPublicTags,
  moveMemo,
  pinMemo,
  unpinMemo,
  featureMemo,
  unfeatureMemo,
} from './memos-service';
import { reactToMemo, unreactToMemo } from './reactions-service';

export const getById = publicProcedure
  .input(getByIdSchema)
  .query(({ ctx, input }) =>
    getMemoById(
      ctx.db,
      ctx.storage,
      ctx.session?.user.id ?? null,
      input,
    ),
  );

export const list = protectedProcedure
  .input(listMemosSchema)
  .query(({ ctx, input }) => listMemos(ctx.db, ctx.storage, personalScope(ctx.session.user.id), ctx.session.user.id, input));

export const listPublic = publicProcedure
  .input(listMemosSchema)
  .query(({ ctx, input }) => listPublicMemos(ctx.db, ctx.storage, ctx.session?.user.id ?? null, input));

export const create = protectedProcedure
  .input(createMemoSchema)
  .mutation(({ ctx, input }) =>
    createMemo(ctx.db, ctx.session.user.id, { kind: 'personal' }, input),
  );

export const listComments = publicProcedure
  .input(listCommentsSchema)
  .query(({ ctx, input }) =>
    listMemoComments(
      ctx.db,
      ctx.storage,
      ctx.session?.user.id ?? null,
      input,
    ),
  );

export const update = protectedProcedure
  .input(updateMemoSchema)
  .mutation(({ ctx, input }) => updateMemo(ctx.db, ctx.session.user.id, input));

// The operator flag the session carries lets an operator delete a public memo too (ADR 0007).
export const deleteMemo = protectedProcedure
  .input(deleteMemoSchema)
  .mutation(({ ctx, input }) => deleteMemoService(ctx.db, ctx.storage, ctx.logger, ctx.session.user, input));

export const move = protectedProcedure
  .input(moveMemoSchema)
  .mutation(({ ctx, input }) =>
    moveMemo(ctx.db, ctx.session.user.id, { kind: 'personal' }, input),
  );

// On the personal procedures for a memo of a space too, as editing and deleting are: a memo
// tells its own scope, and the role there is resolved with it (ADR 0004).
export const pin = protectedProcedure
  .input(pinMemoSchema)
  .mutation(({ ctx, input }) => pinMemo(ctx.db, ctx.session.user.id, input));

export const unpin = protectedProcedure
  .input(pinMemoSchema)
  .mutation(({ ctx, input }) => unpinMemo(ctx.db, ctx.session.user.id, input));

// Any signed-in user may call them; the operator flag the session carries decides (ADR 0007).
export const feature = protectedProcedure
  .input(featureMemoSchema)
  .mutation(({ ctx, input }) => featureMemo(ctx.db, ctx.session.user, input));

export const unfeature = protectedProcedure
  .input(featureMemoSchema)
  .mutation(({ ctx, input }) => unfeatureMemo(ctx.db, ctx.session.user, input));

// Open to any signed-in reader of the memo, its author included, wherever it is read.
export const react = protectedProcedure
  .input(reactSchema)
  .mutation(({ ctx, input }) => reactToMemo(ctx.db, ctx.session.user.id, input));

export const unreact = protectedProcedure
  .input(unreactSchema)
  .mutation(({ ctx, input }) => unreactToMemo(ctx.db, ctx.session.user.id, input));

export const stats = protectedProcedure
  .query(({ ctx }) => getMemoStats(ctx.db, personalScope(ctx.session.user.id)));

export const tags = protectedProcedure
  .query(({ ctx }) => getMemoTags(ctx.db, personalScope(ctx.session.user.id)));

export const publicTags = publicProcedure
  .query(({ ctx }) => getPublicTags(ctx.db));

// The same reads, on a space. They sit on `spaceProcedure` rather than taking an optional
// `spaceId` on the personal procedures: membership is enforced by where a procedure is
// built, not by a branch each procedure must remember to write.
export const space = router({
  create: spaceProcedure
    .input(createSpaceMemoSchema)
    .mutation(({ ctx, input }) =>
      createMemo(ctx.db, ctx.session.user.id, { kind: 'space', membership: ctx.membership }, input),
    ),
  move: spaceProcedure
    .input(moveSpaceMemoSchema)
    .mutation(({ ctx, input }) =>
      moveMemo(ctx.db, ctx.session.user.id, { kind: 'space', membership: ctx.membership }, input),
    ),
  list: spaceProcedure
    .input(listMemosSchema)
    .query(({ ctx, input }) => listMemos(ctx.db, ctx.storage, spaceScope(ctx.membership), ctx.session.user.id, input)),
  stats: spaceProcedure
    .query(({ ctx }) => getMemoStats(ctx.db, spaceScope(ctx.membership))),
  tags: spaceProcedure
    .query(({ ctx }) => getMemoTags(ctx.db, spaceScope(ctx.membership))),
});
