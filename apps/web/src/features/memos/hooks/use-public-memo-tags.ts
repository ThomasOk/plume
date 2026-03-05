import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

interface UsePublicMemoTagsOptions {
  enabled?: boolean;
}

export const usePublicMemoTags = (options?: UsePublicMemoTagsOptions) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.memos.publicTags.queryOptions(),
    enabled: options?.enabled,
  });
};
