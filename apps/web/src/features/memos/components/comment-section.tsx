import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { SlBubble } from 'react-icons/sl';
import { useComments } from '../hooks/use-comments';
import { MemoCard } from './memo-card';
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

  // A link to a comment, or to this section, lands before the comments do: the router finds
  // nothing to scroll to then, so the section does it once they are on the page.
  useEffect(() => {
    if (!isLoading && hash) document.getElementById(hash)?.scrollIntoView();
  }, [hash, isLoading]);

  return (
    <div id="comments" className="scroll-mt-6 space-y-4">
      <div className="flex items-center gap-2">
        <SlBubble className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground tracking-wide">
          Comments {comments.length > 0 && `(${comments.length})`}
        </span>
      </div>

      {user && <MemoForm parentMemoId={memoId} />}

      {isLoading ? (
        <MemoListSkeleton />
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} id={comment.id} className="scroll-mt-6">
              <MemoCard memo={comment} author={comment.author} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
