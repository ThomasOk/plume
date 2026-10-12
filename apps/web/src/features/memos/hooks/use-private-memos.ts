import { useInfiniteQuery } from '@tanstack/react-query';
import { MAX_PAGES, useLoadedMemos } from './use-loaded-memos';
import { useTRPC } from '@/lib/api';

interface UsePrivateMemosOptions {
  enabled?: boolean;
  date?: string;
  tag?: string;
  query?: string;
}

/**
 * The user's personal scope, a page at a time (ADR 0008), pinned first (ADR 0006). The
 * filters are part of the query key, so changing one starts a fresh list from its first
 * page. `memos` is every loaded page in order, each memo once.
 */
export const usePrivateMemos = (options?: UsePrivateMemosOptions) => {
  const trpc = useTRPC();

  const pages = useInfiniteQuery(
    trpc.memos.list.infiniteQueryOptions(
      { date: options?.date, tag: options?.tag, query: options?.query },
      { getNextPageParam: (page) => page.nextCursor ?? undefined, maxPages: MAX_PAGES, enabled: options?.enabled },
    ),
  );

  return { ...pages, memos: useLoadedMemos(pages.data) };
};
