import { useQuery } from '@tanstack/react-query';
import { isInvitationRefused } from '../invitation-errors';
import { useTRPC } from '@/lib/api';

/** What an invitation link leads to. Works signed out: the link is the credential. */
export const useInvitationPreview = (token: string) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.invitations.preview.queryOptions({ token }),
    // An invalid or expired link is an answer: retrying cannot change it.
    retry: (failureCount, error) => !isInvitationRefused(error) && failureCount < 3,
  });
};
