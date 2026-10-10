import { Card, CardContent } from '@repo/ui/components/card';
import { Skeleton } from '@repo/ui/components/skeleton';

const lineWidths = [
  ['w-full', 'w-4/5', 'w-3/4'],
  ['w-5/6', 'w-3/4'],
  ['w-full', 'w-4/5', 'w-2/3', 'w-3/4'],
];

interface MemoCardSkeletonProps {
  index?: number;
  /** Leave the avatar and name out, as the list does where every memo is the user's own. */
  hideAuthor?: boolean;
}

/** A memo card while it loads, laid out as `MemoCard` is, so nothing moves when it arrives. */
export const MemoCardSkeleton = ({ index = 0, hideAuthor = false }: MemoCardSkeletonProps) => {
  const lines = lineWidths[index % lineWidths.length] ?? [];

  return (
    <Card className="py-3 rounded-xl">
      <CardContent>
        {/* Header — mirrors MemoHeader: the byline on the left, the actions menu on the right */}
        <div className="flex justify-between items-center gap-1 mb-3">
          <div className="flex items-center gap-2">
            {!hideAuthor && <Skeleton className="size-7 rounded-full" />}
            <div className="flex flex-col gap-1">
              {!hideAuthor && <Skeleton className="h-3.5 w-24" />}
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
        {/* Content lines — varying widths to look natural */}
        <div className="space-y-2">
          {lines.map((width, i) => (
            <Skeleton key={i} className={`h-4 ${width}`} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const MemoListSkeleton = ({ hideAuthors = false }: { hideAuthors?: boolean }) => (
  <div className="space-y-2">
    {[0, 1, 2].map((i) => (
      <MemoCardSkeleton key={i} index={i} hideAuthor={hideAuthors} />
    ))}
  </div>
);

/** The comments of a memo's page while they load, laid out as `CompactComment` is. */
export const CommentListSkeleton = () => (
  <div className="divide-y divide-border/60">
    {lineWidths.map((lines, i) => (
      <div key={i} className="flex gap-3 py-3">
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 min-h-7">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          {lines.slice(0, 2).map((width, j) => (
            <Skeleton key={j} className={`h-4 ${width}`} />
          ))}
        </div>
      </div>
    ))}
  </div>
);
