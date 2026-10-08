import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useUnfeatureMemo = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const unfeatureMemoOptions = trpc.memos.unfeature.mutationOptions();

  return useMutation({
    mutationFn: unfeatureMemoOptions.mutationFn,
    onSuccess: () => {
      // The memo changes place on Explore, and its mark on its own page.
      queryClient.invalidateQueries({ queryKey: trpc.memos.pathKey() });
    },
  });
};
