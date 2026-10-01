import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

/** The pending invitations of a space. Admins only: call it only when the user is one. */
export const useInvitations = (spaceId: string) => {
  const trpc = useTRPC();

  return useQuery(
    trpc.invitations.list.queryOptions(
      { spaceId },
      // Hands the fetch an abort signal. Without one, React Query cannot cancel a list fetch
      // still in flight when an invitation is sent or revoked: the invalidation joins that
      // fetch instead of starting a new one, and the list shows what it was before the change.
      { trpc: { abortOnUnmount: true } },
    ),
  );
};
