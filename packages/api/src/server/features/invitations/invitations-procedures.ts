import { protectedProcedure, publicProcedure } from '../../trpc';
import { spaceProcedure } from '../spaces';
import {
  createInvitationSchema,
  invitationTokenSchema,
  revokeInvitationSchema,
} from './invitations-schemas';
import {
  acceptInvitation,
  createInvitation,
  listInvitations,
  previewInvitation,
  revokeInvitation,
} from './invitations-service';

export const create = spaceProcedure
  .input(createInvitationSchema)
  .mutation(({ ctx, input }) =>
    createInvitation(ctx.db, ctx.invitationSecret, ctx.session.user.id, ctx.membership, input),
  );

export const list = spaceProcedure.query(({ ctx }) => listInvitations(ctx.db, ctx.membership));

export const revoke = spaceProcedure
  .input(revokeInvitationSchema)
  .mutation(({ ctx, input }) => revokeInvitation(ctx.db, ctx.membership, input));

// Public: the invitation page must tell a signed-out invitee where the link leads.
export const preview = publicProcedure
  .input(invitationTokenSchema)
  .query(({ ctx, input }) => previewInvitation(ctx.db, input.token));

export const accept = protectedProcedure
  .input(invitationTokenSchema)
  .mutation(({ ctx, input }) => acceptInvitation(ctx.db, ctx.session.user.id, input.token));
