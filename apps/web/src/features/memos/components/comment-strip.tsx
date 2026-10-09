import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { LATEST_COMMENTS_SHOWN, useLatestComments } from '../hooks';
import { toPlainText } from '@/utils/markdown-manipulation';

interface CommentStripProps {
  memoId: string;
  commentCount: number;
}

// How far below the viewport a card starts asking for its comments, so they are there by
// the time it scrolls into view.
const NEAR_VIEWPORT = '300px';

/** Whether the element has come near the viewport once; it stays true after. */
function useHasNearedViewport() {
  const ref = useRef<HTMLElement>(null);
  const [hasNeared, setHasNeared] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasNeared) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setHasNeared(true);
      },
      { rootMargin: NEAR_VIEWPORT },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNeared]);

  return { ref, hasNeared };
}

/**
 * The latest comments of a memo, hanging off the bottom edge of its card in a list. The card
 * drops its bottom rounding to carry it, so the strip never reads as the next memo.
 */
export const CommentStrip = ({ memoId, commentCount }: CommentStripProps) => {
  const { ref, hasNeared } = useHasNearedViewport();
  const { data: comments, isError } = useLatestComments(memoId, { enabled: hasNeared });
  // The strip knows how many lines it will show before it has them: holding their room
  // keeps the list below from jumping when they arrive, however fast the reader scrolls.
  const placeholders = Math.min(commentCount, LATEST_COMMENTS_SHOWN);

  return (
    <section
      ref={ref}
      aria-labelledby={`comments-of-${memoId}`}
      className="rounded-b-xl border border-t-0 bg-muted/40 px-6 py-2.5 text-xs transition-[border-color] duration-200 ease-out group-hover/memo:border-primary/50"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={`comments-of-${memoId}`} className="font-medium text-muted-foreground">
          Comments <span className="tabular-nums">{commentCount}</span>
        </h3>
        <Link
          to="/memos/$memoId"
          params={{ memoId }}
          hash="comments"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </Link>
      </div>

      {!comments && !isError && (
        <ul aria-hidden="true" className="mt-1.5 space-y-0.5">
          {Array.from({ length: placeholders }, (_, index) => (
            <li
              key={index}
              data-testid="comment-placeholder"
              className="flex items-center gap-1.5 py-1 motion-safe:animate-pulse"
            >
              <div className="size-4 shrink-0 rounded-full bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </li>
          ))}
        </ul>
      )}

      {comments && comments.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {comments.map((comment) => (
            <li key={comment.id}>
              <Link
                to="/memos/$memoId"
                params={{ memoId }}
                hash={comment.id}
                className="-mx-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Avatar className="size-4 shrink-0">
                  <AvatarImage src={comment.author.image ?? undefined} />
                  <AvatarFallback className="text-[0.5rem]">
                    {comment.author.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="shrink-0 font-medium text-foreground">{comment.author.name}</span>
                <span className="truncate">{toPlainText(comment.content)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
