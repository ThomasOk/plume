import { createFileRoute, Link } from '@tanstack/react-router';
import {
  MemoList,
  MemoListSkeleton,
  useSpaceMemos,
  DateFilterBadge,
  TagFilterBadge,
  SearchFilterBadge,
} from '@/features/memos';
import { MemoForm } from '@/features/memos/components/memo-form';
import { useSpace } from '@/features/spaces';
import { memosSearchSchema } from '@/lib/schemas/search-params';
import { isNotFound } from '@/lib/trpc-errors';

export const Route = createFileRoute('/(memos)/(private)/spaces/$spaceId')({
  validateSearch: (search) => memosSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  const { spaceId } = Route.useParams();
  const { date, tag, query } = Route.useSearch();

  const space = useSpace(spaceId);
  const memos = useSpaceMemos({ spaceId, date, tag, query });

  // A non-member is told the same as for a space that does not exist.
  if (isNotFound(space.error)) {
    return (
      <div className="container mx-auto px-4 pt-4 pb-8 max-w-3xl">
        <p className="text-muted-foreground">Space not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-4 pb-8 max-w-3xl">
      <div className="flex items-baseline gap-4 mb-4">
        <h1 className="text-xl font-semibold truncate flex-1">{space.data?.title}</h1>
        {/* Absent, not disabled, for a member: governance is not offered to who cannot use it. */}
        {space.data?.role === 'admin' && (
          <Link
            to="/spaces/$spaceId/members"
            params={{ spaceId }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Members
          </Link>
        )}
      </div>
      {/* Keyed by space: moving to another space starts a form addressed to that one. */}
      <MemoForm key={spaceId} />
      <div className="flex gap-2 flex-wrap">
        <DateFilterBadge />
        <TagFilterBadge />
        <SearchFilterBadge />
      </div>
      <div className="mt-4">
        {memos.isLoading && <MemoListSkeleton />}
        {memos.error && !isNotFound(memos.error) && (
          <p className="text-destructive">
            Something went wrong. Please try again.
          </p>
        )}
        {memos.data && (
          <MemoList memos={memos.data} emptyMessage="No memos in this space yet." />
        )}
      </div>
    </div>
  );
}
