import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

/** The pending invitations of a space. Admins only: call it only when the user is one. */
export const useInvitations = (spaceId: string) => {
  const trpc = useTRPC();

  return useQuery(
    trpc.invitations.list.queryOptions(
      { spaceId },
      // Hands the fetch an abort signal, so the fetch the invitation hooks cancel before
      // invalidating, when an invitation is sent or revoked, is aborted rather than left to
      // run.
      { trpc: { abortOnUnmount: true } },
    ),
  );
};
