import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const usePinMemo = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const pinMemoOptions = trpc.memos.pin.mutationOptions();

  return useMutation({
    mutationFn: pinMemoOptions.mutationFn,
    onSuccess: () => {
      // The memo changes place in its scope's list, and its mark on its own page.
      queryClient.invalidateQueries({ queryKey: trpc.memos.pathKey() });
    },
  });
};
