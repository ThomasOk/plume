import type { QueryClient, QueryKey } from '@tanstack/react-query';

/** A memo as any cached read holds it: a list's row, or the memo on its own page. */
export type CachedMemo = { id: string };

const isMemo = (value: unknown): value is CachedMemo =>
  typeof value === 'object' && value !== null && typeof (value as CachedMemo).id === 'string';

// A list read a page at a time, as its infinite query caches it.
type Pages = { pages: { items: unknown[] }[]; pageParams: unknown[] };

const isPages = (value: unknown): value is Pages =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as Pages).pages) &&
  (value as Pages).pages.every((page) => typeof page === 'object' && page !== null && Array.isArray(page.items));

// A cached read as it stands once the memo is rewritten: a list holding it, whole or in
// pages, or the memo itself on its page. Anything else (stats, tags, a list without it, a
// memo the rewrite leaves as it is) comes back as it was, the same object, so the caller can
// tell which reads it touched.
const rewriteMemoIn = (data: unknown, memoId: string, rewrite: (memo: CachedMemo) => CachedMemo): unknown => {
  if (isPages(data)) {
    let touched = false;
    const pages = data.pages.map((page) => {
      const items = rewriteMemoIn(page.items, memoId, rewrite) as unknown[];
      if (items === page.items) return page;
      touched = true;
      return { ...page, items };
    });
    return touched ? { ...data, pages } : data;
  }
  if (Array.isArray(data)) {
    let touched = false;
    const next = data.map((item) => {
      const rewritten = rewriteMemoIn(item, memoId, rewrite);
      if (rewritten !== item) touched = true;
      return rewritten;
    });
    return touched ? next : data;
  }
  if (isMemo(data) && data.id === memoId) return rewrite(data);
  return data;
};

/** The reads a rewrite touched, each with its data from before, to put back on failure. */
export type TouchedReads = [QueryKey, unknown][];

/**
 * Rewrites a memo, at once, in every cached read under `queryKey` that holds it, whatever
 * its shape. A refetch of one of them already in flight would land on top of the rewrite
 * with the state before it, so those are cancelled first. Only those: cancelling another
 * read, still on its first fetch, would leave it without data.
 */
export const rewriteCachedMemo = async (
  queryClient: QueryClient,
  queryKey: QueryKey,
  memoId: string,
  rewrite: (memo: CachedMemo) => CachedMemo,
): Promise<TouchedReads> => {
  const holding = queryClient
    .getQueriesData({ queryKey })
    .filter(([, data]) => rewriteMemoIn(data, memoId, rewrite) !== data)
    .map(([key]) => key);
  await Promise.all(holding.map((key) => queryClient.cancelQueries({ queryKey: key, exact: true })));

  const touched: TouchedReads = [];
  for (const key of holding) {
    const data = queryClient.getQueryData(key);
    touched.push([key, data]);
    queryClient.setQueryData(key, rewriteMemoIn(data, memoId, rewrite));
  }
  return touched;
};

/** Puts back what a rewrite touched. */
export const restoreCachedReads = (queryClient: QueryClient, touched: TouchedReads) => {
  for (const [key, data] of touched) queryClient.setQueryData(key, data);
};
