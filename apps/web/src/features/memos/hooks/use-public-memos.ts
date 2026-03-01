import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

interface UsePublicMemosOptions {
  date?: string;
  tag?: string;
  query?: string;
}

export const usePublicMemos = (options?: UsePublicMemosOptions) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.memos.listPublic.queryOptions({
      date: options?.date,
      tag: options?.tag,
      query: options?.query,
    }),
  });
};
