import { createFileRoute } from '@tanstack/react-router';
import {
  MemoList,
  MemoListSkeleton,
  usePublicMemos,
  DateFilterBadge,
  TagFilterBadge,
  SearchFilterBadge,
} from '@/features/memos';
import { memosSearchSchema } from '@/lib/schemas/search-params';

export const Route = createFileRoute('/(memos)/explore')({
  validateSearch: (search) => memosSearchSchema.parse(search),
  component: ExplorePage,
});

function ExplorePage() {
  const search = Route.useSearch();
  const selectedDate = search.date;
  const selectedTag = search.tag;
  const query = search.query;

  const {
    data: memos,
    isLoading,
    error,
  } = usePublicMemos({ date: selectedDate, tag: selectedTag, query });
  return (
    <div className="container mx-auto px-4 pt-4 pb-8 max-w-3xl">
      <h1 className="md:hidden text-lg font-semibold mb-4">Explore</h1>
      <div className="flex gap-2 flex-wrap">
        <DateFilterBadge />
        <TagFilterBadge />
        <SearchFilterBadge />
      </div>
      {isLoading && <MemoListSkeleton />}
      {error && (
        <p className="text-destructive">Error loading memos: {error.message}</p>
      )}
      {memos && <MemoList memos={memos} />}
    </div>
  );
}
