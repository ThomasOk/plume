import { useTRPC } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export const useAttachments = () => {
  const trpc = useTRPC();
  return useQuery(trpc.attachments.list.queryOptions());
};

export const useAttachmentsByMemo = (memoId: string) => {
  const trpc = useTRPC();
  return useQuery(trpc.attachments.list.queryOptions({ memoId }));
};
