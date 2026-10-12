import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useRevokeInvitation = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.invitations.revoke.mutationOptions(),
    onSuccess: async (_result, { spaceId }) => {
      const queryKey = trpc.invitations.list.queryKey({ spaceId });
      // Cancelled first: an invalidation joins a list fetch still in flight rather than
      // restarting it when the list has no data yet, its first load, and that fetch, read
      // before the invitation was revoked, would land last and bring it back.
      await queryClient.cancelQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey });
    },
  });
};
