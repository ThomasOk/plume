import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useLatestComments } from '../hooks';

interface CommentStripProps {
  memoId: string;
  commentCount: number;
}

// How far below the viewport a card starts asking for its comments, so they are there by
// the time it scrolls into view.
const NEAR_VIEWPORT = '300px';

function stripMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')    // **bold**
    .replace(/\*(.+?)\*/g, '$1')         // *italic*
    .replace(/__(.+?)__/g, '$1')         // __bold__
    .replace(/_(.+?)_/g, '$1')           // _italic_
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [link](url) → link
    .replace(/`(.+?)`/g, '$1')           // `code`
    .replace(/#{1,6}\s/g, '')            // ## headers (not #tags)
    .replace(/\n+/g, ' ')               // newlines → space
    .trim();
}

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
  const { data: comments = [] } = useLatestComments(memoId, { enabled: hasNeared });

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

      {comments.length > 0 && (
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
                <span className="truncate">{stripMarkdown(comment.content)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
