import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/explore')({
  component: ExplorePage,
});

function ExplorePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Explore</h1>
      <p className="text-muted-foreground">Public memos will appear here.</p>
    </div>
  );
}
