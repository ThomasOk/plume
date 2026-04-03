import { useNotifications } from '../hooks/use-notifications';
import { NotificationItem } from './notification-item';

export const NotificationList = () => {
  const { data: notifications, isLoading, isError } = useNotifications();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg border bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load notifications. Please try again.
      </p>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No notifications yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
};
