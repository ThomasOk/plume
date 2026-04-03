import { createFileRoute, Link } from '@tanstack/react-router';
import {
  MemoList,
  MemoListSkeleton,
  usePublicMemos,
  DateFilterBadge,
  TagFilterBadge,
  SearchFilterBadge,
} from '@/features/memos';
import { memosSearchSchema } from '@/lib/schemas/search-params';
import { authClient } from '@/lib/authClient';
import { GiFeather } from 'react-icons/gi';

export const Route = createFileRoute('/(memos)/explore')({
  validateSearch: (search) => memosSearchSchema.parse(search),
  component: ExplorePage,
});

function ExplorePage() {
  const { data: session } = authClient.useSession();
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
      {!session && (
        <div className="flex items-center justify-between gap-4 mb-5 px-4 py-3 rounded-xl border bg-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <GiFeather className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground truncate">
              Keep your own notes with Plume.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              className="text-sm font-medium text-primary hover:opacity-80 transition-opacity"
            >
              Create account →
            </Link>
          </div>
        </div>
      )}
      <h1 className="md:hidden text-lg font-semibold mb-4">Explore</h1>
      <div className="flex gap-2 flex-wrap">
        <DateFilterBadge />
        <TagFilterBadge />
        <SearchFilterBadge />
      </div>
      {isLoading && <MemoListSkeleton />}
      {error && (
        <p className="text-destructive">Something went wrong. Please try again.</p>
      )}
      {memos && <MemoList memos={memos} />}
    </div>
  );
}
