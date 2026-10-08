import { protectedProcedure } from '../../trpc';
import { updatePreferencesSchema } from './preferences-schemas';
import { getPreferences, updatePreferences } from './preferences-service';

export const get = protectedProcedure
  .query(({ ctx }) => getPreferences(ctx.db, ctx.session.user.id));

export const update = protectedProcedure
  .input(updatePreferencesSchema)
  .mutation(({ ctx, input }) => updatePreferences(ctx.db, ctx.session.user.id, input));
