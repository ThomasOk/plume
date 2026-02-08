import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

interface UseMemosStatsOptions {
  enabled?: boolean;
}

export const useMemosStats = (options?: UseMemosStatsOptions) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.memos.stats.queryOptions(),
    enabled: options?.enabled,
  });
};
