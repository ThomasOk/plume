import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useRemoveMember = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.spaces.members.remove.mutationOptions(),
    onSuccess: (_result, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: trpc.spaces.members.list.queryKey({ spaceId }) });
    },
  });
};
