import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useComments = (memoId: string) => {
  const trpc = useTRPC();
  return useQuery(trpc.memos.listComments.queryOptions({ memoId }));
};
