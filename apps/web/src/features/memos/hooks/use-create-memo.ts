import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useCreateMemo = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createMemoOptions = trpc.memos.create.mutationOptions();

  return useMutation({
    mutationFn: createMemoOptions.mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        //queryKey: trpc.memos.listPublic.queryKey(),
        queryKey: [['memos']],
      });
    },
  });
};
