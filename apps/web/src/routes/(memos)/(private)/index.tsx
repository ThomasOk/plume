import { createFileRoute } from '@tanstack/react-router';
import {
  MemoList,
  MemoListSkeleton,
  usePrivateMemos,
  DateFilterBadge,
  TagFilterBadge,
  SearchFilterBadge,
} from '@/features/memos';
import { MemoForm } from '@/features/memos/components/memo-form';
import { authClient } from '@/lib/authClient';
import { memosSearchSchema } from '@/lib/schemas/search-params';

export const Route = createFileRoute('/(memos)/(private)/')({
  validateSearch: (search) => memosSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const search = Route.useSearch();
  const selectedDate = search.date;
  const selectedTag = search.tag;
  const query = search.query;

  const {
    data: memos,
    isLoading,
    error,
  } = usePrivateMemos({
    enabled: !!session?.user,
    date: selectedDate,
    tag: selectedTag,
    query,
  });

  return (
    <div className="container mx-auto px-4 pt-4 pb-8 max-w-3xl">
      <MemoForm />
      <div className="flex gap-2 flex-wrap">
        <DateFilterBadge />
        <TagFilterBadge />
        <SearchFilterBadge />
      </div>
      <div className="mt-4">
        {isLoading && <MemoListSkeleton />}
        {error && (
          <p className="text-destructive">
            Something went wrong. Please try again.
          </p>
        )}
        {memos && <MemoList memos={memos} />}
      </div>
    </div>
  );
}
