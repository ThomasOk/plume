import { createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import { useMemoById } from '@/features/memos';
import { CommentSection } from '@/features/memos/components/comment-section';
import { MemoCard } from '@/features/memos/components/memo-card';
import { MemoContext } from '@/features/memos/contexts/memo-context';

export const Route = createFileRoute('/memos/$memoId')({
  component: MemoDetailPage,
});

function MemoDetailPage() {
  const { memoId } = Route.useParams();
  const { data: memo, isLoading, error } = useMemoById(memoId);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 pt-8 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !memo) {
    return (
      <div className="container mx-auto px-4 pt-8 max-w-5xl">
        <p className="text-destructive">Memo not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-6 pb-12 max-w-5xl">
      <div className="flex gap-6 items-start">
        {/* Main — memo card */}
        <div className="flex-1 min-w-0 space-y-8">
          <MemoContext.Provider value={{ memo }}>
            <MemoCard memo={memo} author={memo.author} hideCommentPreview />
          </MemoContext.Provider>

          {!memo.parentId && <CommentSection memoId={memo.id} />}
        </div>

        {/* Sidebar — metadata */}
        <aside className="hidden md:flex flex-col gap-5 w-52 shrink-0">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Created at
            </p>
            <p className="text-sm">{format(memo.createdAt, 'PPpp')}</p>
          </div>

          {memo.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {memo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 bg-muted/50 border border-border/50 rounded-md text-xs text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
