import { useTRPC } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export const usePublicMemos = () => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.memos.listPublic.queryOptions(),
  });
};
