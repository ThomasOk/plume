import { protectedProcedure, publicProcedure, router } from '../../trpc';
import { spaceProcedure } from '../spaces';
import { personalScope, spaceScope } from './memo-scope';
import {
  createMemoSchema,
  updateMemoSchema,
  deleteMemoSchema,
  listMemosSchema,
  listCommentsSchema,
  getByIdSchema,
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
} from './memos-service';

export const getById = publicProcedure
  .input(getByIdSchema)
  .query(({ ctx, input }) =>
    getMemoById(
      ctx.db,
      ctx.storage,
      ctx.session ? personalScope(ctx.session.user.id) : null,
      input,
    ),
  );

export const list = protectedProcedure
  .input(listMemosSchema)
  .query(({ ctx, input }) => listMemos(ctx.db, ctx.storage, personalScope(ctx.session.user.id), input));

export const listPublic = publicProcedure
  .input(listMemosSchema)
  .query(({ ctx, input }) => listPublicMemos(ctx.db, ctx.storage, input));

export const create = protectedProcedure
  .input(createMemoSchema)
  .mutation(({ ctx, input }) =>
    createMemo(ctx.db, ctx.session.user.id, personalScope(ctx.session.user.id), input),
  );

export const listComments = publicProcedure
  .input(listCommentsSchema)
  .query(({ ctx, input }) =>
    listMemoComments(
      ctx.db,
      ctx.storage,
      ctx.session ? personalScope(ctx.session.user.id) : null,
      input,
    ),
  );

export const update = protectedProcedure
  .input(updateMemoSchema)
  .mutation(({ ctx, input }) => updateMemo(ctx.db, ctx.session.user.id, input));

export const deleteMemo = protectedProcedure
  .input(deleteMemoSchema)
  .mutation(({ ctx, input }) => deleteMemoService(ctx.db, ctx.session.user.id, input));

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
  list: spaceProcedure
    .input(listMemosSchema)
    .query(({ ctx, input }) => listMemos(ctx.db, ctx.storage, spaceScope(ctx.membership), input)),
  stats: spaceProcedure
    .query(({ ctx }) => getMemoStats(ctx.db, spaceScope(ctx.membership))),
  tags: spaceProcedure
    .query(({ ctx }) => getMemoTags(ctx.db, spaceScope(ctx.membership))),
});
