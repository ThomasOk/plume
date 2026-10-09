import { Link, createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import { RiGroupLine } from 'react-icons/ri';
import { useMemoById } from '@/features/memos';
import { CommentSection } from '@/features/memos/components/comment-section';
import { MemoCard } from '@/features/memos/components/memo-card';
import { MemoContext } from '@/features/memos/contexts/memo-context';
import { useSpace } from '@/features/spaces';

export const Route = createFileRoute('/memos/$memoId')({
  component: MemoDetailPage,
});

function MemoDetailPage() {
  const { memoId } = Route.useParams();
  const { data: memo, isLoading, error } = useMemoById(memoId);
  // A link to a memo carries the memo, not its space: the memo names it.
  const space = useSpace(memo?.spaceId ?? undefined);

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
            <MemoCard memo={memo} author={memo.author} hideCommentStrip markFeatured />
          </MemoContext.Provider>

          {!memo.parentId && <CommentSection memoId={memo.id} />}
        </div>

        {/* Sidebar — metadata */}
        <aside className="hidden md:flex flex-col gap-5 w-52 shrink-0">
          {memo.spaceId && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Space
              </p>
              <Link
                to="/spaces/$spaceId"
                params={{ spaceId: memo.spaceId }}
                className="inline-flex items-center gap-1.5 text-sm hover:underline min-w-0"
              >
                <RiGroupLine className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{space.data?.title ?? 'Space'}</span>
              </Link>
            </div>
          )}

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
