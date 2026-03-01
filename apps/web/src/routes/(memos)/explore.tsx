import { createFileRoute } from '@tanstack/react-router';
import {
  MemoList,
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
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Explore</h1>
        <p className="text-muted-foreground mt-1">
          Discover public memos from all users.
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <DateFilterBadge />
        <TagFilterBadge />
        <SearchFilterBadge />
      </div>
      {isLoading && <p className="text-muted-foreground">Loading memos...</p>}
      {error && (
        <p className="text-destructive">Error loading memos: {error.message}</p>
      )}
      {memos && <MemoList memos={memos} />}
    </div>
  );
}
