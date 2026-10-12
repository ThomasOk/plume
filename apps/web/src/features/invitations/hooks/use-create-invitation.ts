import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useCreateInvitation = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.invitations.create.mutationOptions(),
    onSuccess: async (_invitation, { spaceId }) => {
      const queryKey = trpc.invitations.list.queryKey({ spaceId });
      // Cancelled first: an invalidation joins a list fetch still in flight rather than
      // restarting it when the list has no data yet, its first load, and that fetch, read
      // before the invitation was sent, would land last and hide it.
      await queryClient.cancelQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey });
    },
  });
};
