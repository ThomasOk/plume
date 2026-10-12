import type { InfiniteData } from '@tanstack/react-query';
import { useMemo } from 'react';

// The pages a list keeps, and so refetches after a mutation invalidates it: 500 memos. Past
// it, the first page is dropped to make room: the top of the list is out of reach until a
// reload, and the positions the list announces start again from the memos still loaded.
// Getting it back would take a cursor that reads upwards; a reader 500 memos down is rare
// enough not to build one yet.
export const MAX_PAGES = 25;

/**
 * Every loaded page of a list read a page at a time, in order, each memo once: a memo that
 * leaves the leading block while the reader scrolls (unpinned, unfeatured) moves below their
 * cursor and comes back on a later page.
 */
export const useLoadedMemos = <T extends { id: string }>(data: InfiniteData<{ items: T[] }> | undefined) =>
  useMemo(() => {
    if (!data) return undefined;
    const seen = new Set<string>();
    return data.pages.flatMap((page) => page.items).filter((memo) => !seen.has(memo.id) && seen.add(memo.id));
  }, [data]);
