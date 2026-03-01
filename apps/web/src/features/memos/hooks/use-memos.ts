import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

interface UseMemosOptions {
  enabled?: boolean;
  date?: string;
  tag?: string;
  query?: string;
}

export const useMemos = (options?: UseMemosOptions) => {
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
