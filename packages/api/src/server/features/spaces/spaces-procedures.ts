import { protectedProcedure } from '../../trpc';
import { spaceProcedure } from './space-procedure';
import { createSpaceSchema } from './spaces-schemas';
import { createSpace, getSpace, listSpaces } from './spaces-service';

export const create = protectedProcedure
  .input(createSpaceSchema)
  .mutation(({ ctx, input }) => createSpace(ctx.db, ctx.session.user.id, input));

export const list = protectedProcedure
  .query(({ ctx }) => listSpaces(ctx.db, ctx.session.user.id));

export const get = spaceProcedure
  .query(({ ctx }) => getSpace(ctx.db, ctx.membership));
