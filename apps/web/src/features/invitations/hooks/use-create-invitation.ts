import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useCreateInvitation = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.invitations.create.mutationOptions(),
    onSuccess: (_invitation, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: trpc.invitations.list.queryKey({ spaceId }) });
    },
  });
};
