import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

interface UseMemosOptions {
  enabled?: boolean;
  date?: string;
  tag?: string;
}

export const useMemos = (options?: UseMemosOptions) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.memos.list.queryOptions({ date: options?.date, tag: options?.tag }),
    enabled: options?.enabled,
  });
};
