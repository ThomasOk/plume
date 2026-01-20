import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/resources')({
  component: ResourcesPage,
});

function ResourcesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Resources</h1>
      <p className="text-muted-foreground">
        Your attachments and resources will appear here.
      </p>
    </div>
  );
}
