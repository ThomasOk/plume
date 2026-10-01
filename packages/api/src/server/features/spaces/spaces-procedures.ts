import { protectedProcedure, router } from '../../trpc';
import { changeRole, leaveSpace, listMembers, removeMember } from './space-members-service';
import { spaceProcedure } from './space-procedure';
import { changeRoleSchema, createSpaceSchema, memberInputSchema, renameSpaceSchema } from './spaces-schemas';
import {
  createSpace,
  deleteSpace as deleteSpaceService,
  getSpace,
  listSpaces,
  renameSpace,
} from './spaces-service';

export const create = protectedProcedure
  .input(createSpaceSchema)
  .mutation(({ ctx, input }) => createSpace(ctx.db, ctx.session.user.id, input));

export const list = protectedProcedure
  .query(({ ctx }) => listSpaces(ctx.db, ctx.session.user.id));

export const get = spaceProcedure
  .query(({ ctx }) => getSpace(ctx.db, ctx.membership));

export const rename = spaceProcedure
  .input(renameSpaceSchema)
  .mutation(({ ctx, input }) => renameSpace(ctx.db, ctx.membership, input));

export const deleteSpace = spaceProcedure
  .mutation(({ ctx }) => deleteSpaceService(ctx.db, ctx.membership));

export const members = router({
  list: spaceProcedure.query(({ ctx }) => listMembers(ctx.db, ctx.session.user.id, ctx.membership)),
  changeRole: spaceProcedure
    .input(changeRoleSchema)
    .mutation(({ ctx, input }) => changeRole(ctx.db, ctx.session.user.id, ctx.membership, input)),
  remove: spaceProcedure
    .input(memberInputSchema)
    .mutation(({ ctx, input }) => removeMember(ctx.db, ctx.session.user.id, ctx.membership, input)),
});

export const leave = spaceProcedure
  .mutation(({ ctx }) => leaveSpace(ctx.db, ctx.session.user.id, ctx.membership));
