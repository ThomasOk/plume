import { Card, CardContent } from '@repo/ui/components/card';
import { Skeleton } from '@repo/ui/components/skeleton';

const lineWidths = [
  ['w-full', 'w-4/5', 'w-3/4'],
  ['w-5/6', 'w-3/4'],
  ['w-full', 'w-4/5', 'w-2/3', 'w-3/4'],
];

const MemoCardSkeleton = ({ index }: { index: number }) => {
  const lines = lineWidths[index % lineWidths.length];

  return (
    <Card className="py-3 rounded-xl">
      <CardContent>
        <div>
          {/* Header — mirrors the actions area of MemoCard */}
          <div className="flex justify-end items-center gap-1 mb-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-8 w-8" />
          </div>
          {/* Content lines — varying widths to look natural */}
          <div className="space-y-2 mb-4">
            {lines.map((width, i) => (
              <Skeleton key={i} className={`h-4 ${width}`} />
            ))}
          </div>
          {/* Footer — mirrors the timestamp */}
          <div className="flex justify-end">
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const MemoListSkeleton = () => (
  <div className="space-y-2">
    {[0, 1, 2].map((i) => (
      <MemoCardSkeleton key={i} index={i} />
    ))}
  </div>
);
