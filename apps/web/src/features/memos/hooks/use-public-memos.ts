import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTRPC } from '@/lib/api';

interface UsePublicMemosOptions {
  date?: string;
  tag?: string;
  query?: string;
}

// The pages kept, and so refetched after a mutation invalidates Explore: 500 memos. Past
// it, the first page is dropped to make room: the top of Explore is out of reach until a
// reload, and the positions the list announces start again from the memos still loaded.
// Getting it back would take a cursor that reads upwards; a reader 500 memos down is rare
// enough not to build one yet.
const MAX_PAGES = 25;

/**
 * Explore, a page at a time (ADR 0008). The filters are part of the query key, so changing
 * one starts a fresh list from its first page rather than mixing two filters' results.
 * `memos` is every loaded page in order, each memo once: a memo unfeatured while the reader
 * scrolls moves below their cursor and comes back on a later page.
 */
export const usePublicMemos = (options?: UsePublicMemosOptions) => {
  const trpc = useTRPC();

  const pages = useInfiniteQuery(
    trpc.memos.listPublic.infiniteQueryOptions(
      { date: options?.date, tag: options?.tag, query: options?.query },
      { getNextPageParam: (page) => page.nextCursor ?? undefined, maxPages: MAX_PAGES },
    ),
  );

  const memos = useMemo(() => {
    if (!pages.data) return undefined;
    const seen = new Set<string>();
    return pages.data.pages.flatMap((page) => page.items).filter((memo) => !seen.has(memo.id) && seen.add(memo.id));
  }, [pages.data]);

  return { ...pages, memos };
};
