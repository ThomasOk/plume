import { Button } from '@repo/ui/components/button';
import { useLocation } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { SlBubble } from 'react-icons/sl';
import { useComments } from '../hooks/use-comments';
import { CompactComment } from './compact-comment';
import { MemoForm } from './memo-form';
import { MemoListSkeleton } from './memo-list-skeleton';
import { useAuth } from '@/features/auth/hooks/use-auth';

interface CommentSectionProps {
  memoId: string;
}

export const CommentSection = ({ memoId }: CommentSectionProps) => {
  // Oldest first, as the API returns them.
  const { data: comments = [], isLoading } = useComments(memoId);
  const { user } = useAuth();
  const hash = useLocation({ select: (location) => location.hash });
  // The form opens on demand, so the comments come first. Closing it keeps the draft.
  const [isWriting, setIsWriting] = useState(false);
  const writeButtonRef = useRef<HTMLButtonElement>(null);

  // A link to a comment, or to this section, lands before the comments do: the router finds
  // nothing to scroll to then, so the section does it once they are on the page.
  useEffect(() => {
    if (!isLoading && hash) document.getElementById(hash)?.scrollIntoView();
  }, [hash, isLoading]);

  // Back to the button the form replaced, so a keyboard user carries on from there.
  const stopWriting = () => {
    setIsWriting(false);
    requestAnimationFrame(() => writeButtonRef.current?.focus());
  };

  const hasComments = comments.length > 0;
  const writeButton = user && !isWriting && (
    <Button ref={writeButtonRef} variant="outline" size="sm" onClick={() => setIsWriting(true)}>
      Write a comment
    </Button>
  );

  return (
    <section id="comments" className="scroll-mt-6 space-y-3">
      {/* With no comments, the button alone stands for the section. */}
      {hasComments ? (
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground tracking-wide">
            <SlBubble className="size-4" aria-hidden />
            Comments ({comments.length})
          </h2>
          {writeButton}
        </div>
      ) : (
        !isLoading && writeButton
      )}

      {isWriting && (
        <MemoForm parentMemoId={memoId} onSuccess={stopWriting} onCancel={stopWriting} autoFocus />
      )}

      {isLoading ? (
        <MemoListSkeleton />
      ) : (
        <div className="divide-y divide-border/60">
          {comments.map((comment) => (
            <CompactComment key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </section>
  );
};
