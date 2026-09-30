import { SpaceNotFoundError } from '../../shared/errors';
import { protectedProcedure } from '../../trpc';
import { spaceInputSchema } from './spaces-schemas';
import { findMembership } from './spaces-service';

/**
 * A procedure about one space. It resolves, once per request, whether the user is a member
 * and with which role, and puts that on `ctx.membership` so services never re-query it
 * (ADR 0004).
 *
 * It enforces membership only. The role matrix depends on rows it has not loaded — who
 * wrote the memo being deleted — so it belongs to the service, after the load.
 */
export const spaceProcedure = protectedProcedure
  .input(spaceInputSchema)
  .use(async ({ ctx, input, next }) => {
    const membership = await findMembership(ctx.db, ctx.session.user.id, input.spaceId);

    // A non-member gets the same answer as for a space that does not exist.
    if (!membership) throw new SpaceNotFoundError();

    return next({ ctx: { membership } });
  });
