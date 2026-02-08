import { createFileRoute } from '@tanstack/react-router';
import { MemoList, usePublicMemos } from '@/features/memos';

export const Route = createFileRoute('/(memos)/explore')({
  component: ExplorePage,
});

function ExplorePage() {
  const { data: memos, isLoading, error } = usePublicMemos();
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Explore</h1>
        <p className="text-muted-foreground mt-1">
          Discover public memos from all users.
        </p>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading memos...</p>}
      {error && (
        <p className="text-red-500">Error loading memos: {error.message}</p>
      )}
      {memos && <MemoList memos={memos} />}
    </div>
  );
}
