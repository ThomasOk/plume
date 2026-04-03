import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

// Unlike useCreateMemo which busts the entire memos cache, this hook
// invalidates only the comments list for the specific parent memo.
export const useCreateComment = (parentMemoId: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.memos.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.memos.listComments.queryKey({ memoId: parentMemoId }),
      });
    },
  });
};
