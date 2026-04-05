import { Button } from '@repo/ui/components/button';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { NotificationList } from '@/features/notifications/components/notification-list';
import { useMarkAllArchived } from '@/features/notifications/hooks/use-mark-all-archived';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { authClient } from '@/lib/authClient';

export const Route = createFileRoute('/notifications')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();

    if (!data?.user) {
      throw redirect({ to: '/sign-in' });
    }
  },
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: notifications } = useNotifications();
  const { mutate: markAllArchived, isPending } = useMarkAllArchived();

  const hasUnread = notifications?.some((n) => n.status === 'UNREAD') ?? false;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => markAllArchived()}
          >
            Mark all as read
          </Button>
        )}
      </div>
      <NotificationList />
    </div>
  );
}
