import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

// Optimistic: a switch is expected to move the moment it is flipped, not a round trip later.
// A failed save puts the previous value back.
export const useUpdatePreferences = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.preferences.get.queryKey();

  return useMutation(
    trpc.preferences.update.mutationOptions({
      onMutate: async (preferences) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (current) =>
          current ? { ...current, ...preferences } : current,
        );
        return { previous };
      },
      onError: (_error, _preferences, context) => {
        queryClient.setQueryData(queryKey, context?.previous);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey }),
    }),
  );
};
