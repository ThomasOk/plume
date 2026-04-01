import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useAttachments = () => {
  const trpc = useTRPC();
  return useQuery(trpc.attachments.list.queryOptions());
};

export const useAttachmentsByMemo = (memoId: string) => {
  const trpc = useTRPC();
  return useQuery(trpc.attachments.list.queryOptions({ memoId }));
};

export const usePublicAttachmentsByMemo = (memoId: string) => {
  const trpc = useTRPC();
  return useQuery(trpc.attachments.listByMemo.queryOptions({ memoId }));
};

export const useDeleteAttachment = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.attachments.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.attachments.list.queryKey(),
      });
    },
  });
};
