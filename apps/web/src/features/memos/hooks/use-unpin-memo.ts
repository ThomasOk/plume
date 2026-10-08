import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useUnpinMemo = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const unpinMemoOptions = trpc.memos.unpin.mutationOptions();

  return useMutation({
    mutationFn: unpinMemoOptions.mutationFn,
    onSuccess: () => {
      // The memo changes place in its scope's list, and its mark on its own page.
      queryClient.invalidateQueries({ queryKey: trpc.memos.pathKey() });
    },
  });
};
