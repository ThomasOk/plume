import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useRevokeInvitation = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.invitations.revoke.mutationOptions(),
    onSuccess: (_result, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: trpc.invitations.list.queryKey({ spaceId }) });
    },
  });
};
