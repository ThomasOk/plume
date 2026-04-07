import { protectedProcedure } from '../../trpc';
import { searchUsersSchema } from './users-schemas';
import { searchUsers as searchUsersService } from './users-service';

export const search = protectedProcedure
  .input(searchUsersSchema)
  .query(({ ctx, input }) => searchUsersService(ctx.db, ctx.session.user.id, input));
