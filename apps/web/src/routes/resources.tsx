import { createFileRoute, redirect } from '@tanstack/react-router';
import { authClient } from '@/lib/authClient';

export const Route = createFileRoute('/resources')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();

    if (!data?.user) {
      throw redirect({ to: '/sign-in' });
    }
  },
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
