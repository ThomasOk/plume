import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

interface UsePrivateMemoTagsOptions {
  enabled?: boolean;
}

export const usePrivateMemoTags = (options?: UsePrivateMemoTagsOptions) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.memos.tags.queryOptions(),
    enabled: options?.enabled,
  });
};
