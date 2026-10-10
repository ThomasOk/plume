import { Button } from '@repo/ui/components/button';
import { useLocation } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { SlBubble } from 'react-icons/sl';
import { useComments } from '../hooks/use-comments';
import { CompactComment } from './compact-comment';
import { MemoForm } from './memo-form';
import { CommentListSkeleton } from './memo-list-skeleton';
import { useAuth } from '@/features/auth/hooks/use-auth';

interface CommentSectionProps {
  memoId: string;
}

export const CommentSection = ({ memoId }: CommentSectionProps) => {
  // Oldest first, as the API returns them.
  const { data: comments = [], isLoading } = useComments(memoId);
  const { user } = useAuth();
  const hash = useLocation({ select: (location) => location.hash });
  // The form stays open under the comments, as under any thread: oldest first, the thread
  // reads as a conversation, and a new comment lands right above where it was written.
  const formRef = useRef<HTMLDivElement>(null);

  // A link to a comment, or to this section, lands before the comments do: the router finds
  // nothing to scroll to then, so the section does it once they are on the page.
  useEffect(() => {
    if (!isLoading && hash) document.getElementById(hash)?.scrollIntoView();
  }, [hash, isLoading]);

  // The shortcut for a long thread: the caret in the text field, and the whole form in view,
  // down to its Save button, which focusing the field alone would leave below the fold.
  const goToForm = () => {
    formRef.current?.querySelector('textarea')?.focus({ preventScroll: true });
    formRef.current?.scrollIntoView({ block: 'nearest' });
  };

  const hasComments = comments.length > 0;

  return (
    <section id="comments" className="scroll-mt-6 space-y-3">
      {/* With no comments, the form under them alone stands for the section. */}
      {hasComments && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground tracking-wide">
            <SlBubble className="size-4" aria-hidden />
            Comments ({comments.length})
          </h2>
          {user && (
            <Button variant="ghost" size="sm" onClick={goToForm}>
              Write a comment
            </Button>
          )}
        </div>
      )}

      {isLoading ? (
        <CommentListSkeleton />
      ) : (
        <div className="divide-y divide-border/60">
          {comments.map((comment) => (
            <CompactComment key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {/* Not focused on arrival: that would raise the keyboard on a phone, and pull a reader
          who followed a link to one comment down to the form. */}
      {user && (
        <div ref={formRef}>
          <MemoForm parentMemoId={memoId} />
        </div>
      )}
    </section>
  );
};
