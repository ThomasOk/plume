import { protectedProcedure } from '../../trpc';
import { deleteAccountSchema } from './account-schemas';
import { deleteAccount } from './account-service';

export const deleteProcedure = protectedProcedure
  .input(deleteAccountSchema)
  .mutation(({ ctx, input }) =>
    deleteAccount(
      ctx.db,
      ctx.storage,
      ctx.logger,
      { userId: ctx.session.user.id, signedInAt: ctx.session.session.createdAt },
      input,
    ),
  );
