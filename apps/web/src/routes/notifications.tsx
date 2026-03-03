import { createFileRoute, redirect } from '@tanstack/react-router';
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
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      <p className="text-muted-foreground">
        Your notifications will appear here.
      </p>
    </div>
  );
}
