import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useDeleteMemo = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteMemoOptions = trpc.memos.delete.mutationOptions();

  return useMutation({
    mutationFn: deleteMemoOptions.mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        //queryKey: trpc.memos.listPublic.queryKey(),
        queryKey: [['memos']],
      });
    },
  });
};
