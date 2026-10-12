import { useInfiniteQuery } from '@tanstack/react-query';
import { MAX_PAGES, useLoadedMemos } from './use-loaded-memos';
import { useTRPC } from '@/lib/api';

interface UsePublicMemosOptions {
  date?: string;
  tag?: string;
  query?: string;
}

/**
 * Explore, a page at a time (ADR 0008). The filters are part of the query key, so changing
 * one starts a fresh list from its first page rather than mixing two filters' results.
 * `memos` is every loaded page in order, each memo once.
 */
export const usePublicMemos = (options?: UsePublicMemosOptions) => {
  const trpc = useTRPC();

  const pages = useInfiniteQuery(
    trpc.memos.listPublic.infiniteQueryOptions(
      { date: options?.date, tag: options?.tag, query: options?.query },
      { getNextPageParam: (page) => page.nextCursor ?? undefined, maxPages: MAX_PAGES },
    ),
  );

  return { ...pages, memos: useLoadedMemos(pages.data) };
};
