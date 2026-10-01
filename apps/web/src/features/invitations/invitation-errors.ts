import { TRPCClientError } from '@trpc/client';

// How the server refuses an invitation link: NOT_FOUND when it was used, revoked, replaced or
// never issued; PRECONDITION_FAILED when it expired; CONFLICT when the user following it is
// already a member. All are final for this user and this link.
export type InvitationRefusal = 'invalid' | 'expired' | 'already-member';

export const invitationRefusal = (error: unknown): InvitationRefusal | null => {
  if (!(error instanceof TRPCClientError)) return null;
  const code = error.data?.code;
  if (code === 'NOT_FOUND') return 'invalid';
  if (code === 'PRECONDITION_FAILED') return 'expired';
  if (code === 'CONFLICT') return 'already-member';
  return null;
};

export const isInvitationRefused = (error: unknown): boolean => invitationRefusal(error) !== null;
