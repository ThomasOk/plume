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
  const { data: rawComments = [], isLoading } = useComments(memoId);
  const comments = rawComments.slice().sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const { user } = useAuth();

  return (
    <div id="comments" className="space-y-4">
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
            <MemoCard key={comment.id} memo={comment} author={comment.author} />
          ))}
        </div>
      )}
    </div>
  );
};
