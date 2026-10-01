import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useChangeMemberRole = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.spaces.members.changeRole.mutationOptions(),
    onSuccess: (_result, { spaceId }) => {
      // The user may have changed their own role, which the space and the switcher show.
      queryClient.invalidateQueries({ queryKey: trpc.spaces.pathKey() });
      queryClient.invalidateQueries({ queryKey: trpc.spaces.members.list.queryKey({ spaceId }) });
    },
  });
};
