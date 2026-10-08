import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/notifications')({
  component: NotificationsSettings,
});

function NotificationsSettings() {
  return (
    <p className="text-sm text-muted-foreground">
      Notifications settings will appear here.
    </p>
  );
}
