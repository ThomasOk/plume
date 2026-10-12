import { Button } from '@repo/ui/components/button';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import type { Author, Memo } from '@/lib/types';
import { MemoCard } from './memo-card';
import Spinner from '@/components/ui/spinner';

type MemoListItem = Memo & { author?: Author };

/** Where a list read a page at a time stands, as its infinite query tells it. */
export interface MemoListPagination {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** The last request for a page failed: the reader retries by hand. */
  isFetchNextPageError: boolean;
  fetchNextPage: () => unknown;
}

interface MemoListProps {
  memos: MemoListItem[];
  emptyMessage?: string;
  /** Leave the byline out where every memo has the same author: the user's own. */
  hideAuthors?: boolean;
  /** Leave pins out where the list is no one's scope: Explore. */
  ignorePins?: boolean;
  /** Mark the featured memos where featuring decides the order: Explore. */
  markFeatured?: boolean;
  /** For a list read a page at a time; without it, `memos` is the whole list. */
  pagination?: MemoListPagination;
}

// The next page is asked for while this many memos remain to be read, so a reader
// scrolling at a normal pace never reaches the end before it arrives.
const MEMOS_LEFT_WHEN_LOADING = 5;

// A ref for the element whose appearance on screen asks for the next page. A new element
// (the list grew) gets a new observer, which reports it at once if it is already visible.
const useOnVisible = (onVisible: () => void) => {
  const latest = useRef(onVisible);
  useEffect(() => {
    latest.current = onVisible;
  });
  const observer = useRef<IntersectionObserver | null>(null);

  return useCallback((element: Element | null) => {
    observer.current?.disconnect();
    if (!element) return;
    observer.current = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) latest.current();
    });
    observer.current.observe(element);
  }, []);
};

/**
 * The memos of a list, as an ARIA feed: each memo an article that tells its position, the
 * size unknown until the list is exhausted. A list read a page at a time loads its next
 * page on its own as the reader nears the end, offers "Load more" if that fails, and says
 * when there is nothing more.
 */
export const MemoList = ({
  memos,
  emptyMessage = 'No memos yet. Start creating one!',
  hideAuthors = false,
  ignorePins = false,
  markFeatured = false,
  pagination,
}: MemoListProps) => {
  const prefersReducedMotion = useReducedMotion();
  const hasNextPage = pagination?.hasNextPage ?? false;
  const loadsOnItsOwn = hasNextPage && !pagination?.isFetchingNextPage && !pagination?.isFetchNextPageError;
  const triggerRef = useOnVisible(() => {
    if (loadsOnItsOwn) pagination?.fetchNextPage();
  });

  // "Load more" leaves the page once the memos arrive, and focus with it: it goes to the
  // first memo loaded instead, where a keyboard reader would continue, rather than back
  // to the top of the page.
  const feedRef = useRef<HTMLDivElement>(null);
  const focusFrom = useRef<number | null>(null);
  useEffect(() => {
    const from = focusFrom.current;
    if (from === null || memos.length <= from) return;
    focusFrom.current = null;
    feedRef.current?.querySelectorAll<HTMLElement>(':scope > article')[from]?.focus();
  }, [memos.length]);
  const loadMore = () => {
    focusFrom.current = memos.length;
    pagination?.fetchNextPage();
  };

  if (memos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const trigger = Math.max(0, memos.length - MEMOS_LEFT_WHEN_LOADING);
  const setSize = hasNextPage ? -1 : memos.length;

  return (
    <>
      <div ref={feedRef} role="feed" aria-busy={pagination?.isFetchingNextPage ?? false} aria-label="Memos" className="space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {memos.map((memo, index) => (
            <motion.article
              key={memo.id}
              ref={index === trigger ? triggerRef : undefined}
              aria-posinset={index + 1}
              aria-setsize={setSize}
              // Focusable, not in the tab order: focus can be put on a memo without adding a
              // stop per memo between its buttons.
              tabIndex={-1}
              className="outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-xl"
              layout={!prefersReducedMotion}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
              animate={{ opacity: 1, y: 0 }}
              // popLayout takes the leaving card out of the flow, and the cards below slide up
              // through `layout`: fading it is enough, without animating its height.
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: [0.215, 0.61, 0.355, 1] }}
            >
              <MemoCard memo={memo} author={hideAuthors ? undefined : memo.author} ignorePins={ignorePins} markFeatured={markFeatured} />
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
      {pagination && (
        <>
          <p role="status" className="sr-only">
            {pagination.isFetchingNextPage ? 'Loading more memos…' : `${memos.length} memos loaded`}
          </p>
          <div className="flex justify-center py-6 text-sm text-muted-foreground">
            {pagination.isFetchNextPageError ? (
              <div className="flex flex-col items-center gap-2">
                <p>The next memos could not be loaded.</p>
                <Button variant="outline" disabled={pagination.isFetchingNextPage} onClick={loadMore}>
                  {pagination.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            ) : pagination.isFetchingNextPage ? (
              <Spinner />
            ) : (
              !hasNextPage && <p>You’ve reached the end.</p>
            )}
          </div>
        </>
      )}
    </>
  );
};
