import { useTRPC } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

interface UsePublicMemosOptions {
  date?: string;
}

export const usePublicMemos = (options?: UsePublicMemosOptions) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.memos.listPublic.queryOptions({ date: options?.date }),
  });
};
