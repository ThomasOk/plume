import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

interface UsePrivateMemosOptions {
  enabled?: boolean;
  date?: string;
  tag?: string;
  query?: string;
}

export const usePrivateMemos = (options?: UsePrivateMemosOptions) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.memos.list.queryOptions({
      date: options?.date,
      tag: options?.tag,
      query: options?.query,
    }),
    enabled: options?.enabled,
  });
};
