import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/notifications')({
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      <p className="text-muted-foreground">
        Your notifications will appear here.
      </p>
    </div>
  );
}
