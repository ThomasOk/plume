import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useFeatureMemo = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const featureMemoOptions = trpc.memos.feature.mutationOptions();

  return useMutation({
    mutationFn: featureMemoOptions.mutationFn,
    onSuccess: () => {
      // The memo changes place on Explore, and its mark on its own page.
      queryClient.invalidateQueries({ queryKey: trpc.memos.pathKey() });
    },
  });
};
