import { useQuery } from '@tanstack/react-query';
import type { MemoViewScope } from '../types';
import { useTRPC } from '@/lib/api';
import { retryUnlessNotFound } from '@/lib/trpc-errors';

interface UseMemoTagsOptions {
  scope: MemoViewScope;
  enabled?: boolean;
}

// The Tag tree of a scope: the user's personal memos, or a space's.
export const useMemoTags = ({ scope, enabled }: UseMemoTagsOptions) => {
  const trpc = useTRPC();

  return useQuery({
    ...(scope.kind === 'space'
      ? trpc.memos.space.tags.queryOptions({ spaceId: scope.spaceId })
      : trpc.memos.tags.queryOptions()),
    retry: retryUnlessNotFound,
    enabled,
  });
};
