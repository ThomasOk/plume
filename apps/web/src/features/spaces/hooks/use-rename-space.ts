import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useRenameSpace = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.spaces.rename.mutationOptions(),
    onSuccess: () => {
      // The title shows in the space's page and in the switcher.
      queryClient.invalidateQueries({ queryKey: trpc.spaces.pathKey() });
    },
  });
};
