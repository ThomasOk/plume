import { useInfiniteQuery } from '@tanstack/react-query';
import { MAX_PAGES, useLoadedMemos } from './use-loaded-memos';
import { useTRPC } from '@/lib/api';
import { retryUnlessNotFound } from '@/lib/trpc-errors';

interface UseSpaceMemosOptions {
  spaceId: string;
  date?: string;
  tag?: string;
  query?: string;
}

/**
 * A space, a page at a time (ADR 0008), the memos an admin pinned first (ADR 0006). The space
 * and the filters are part of the query key, so moving to another space or changing a filter
 * starts a fresh list from its first page. `memos` is every loaded page in order, each memo
 * once.
 */
export const useSpaceMemos = ({ spaceId, date, tag, query }: UseSpaceMemosOptions) => {
  const trpc = useTRPC();

  const pages = useInfiniteQuery({
    ...trpc.memos.space.list.infiniteQueryOptions(
      { spaceId, date, tag, query },
      { getNextPageParam: (page) => page.nextCursor ?? undefined, maxPages: MAX_PAGES },
    ),
    retry: retryUnlessNotFound,
  });

  return { ...pages, memos: useLoadedMemos(pages.data) };
};
