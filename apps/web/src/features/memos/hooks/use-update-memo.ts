import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useUpdateMemo = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateMemoOptions = trpc.memos.update.mutationOptions();

  return useMutation({
    mutationFn: updateMemoOptions.mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        //queryKey: trpc.memos.listPublic.queryKey(),
        queryKey: [['memos']],
      });
    },
  });
};
