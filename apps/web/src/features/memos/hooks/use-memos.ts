import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

interface UseMemosOptions {
  enabled?: boolean;
}

export const useMemos = (options?: UseMemosOptions) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.memos.list.queryOptions(),
    enabled: options?.enabled,
  });
};
