import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { authClient } from '@/lib/authClient';

export const Route = createFileRoute('/(memos)/(private)')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();

    if (!data?.user) {
      throw redirect({ to: '/sign-in' });
    }
  },
  component: PrivateMemosLayout,
});

function PrivateMemosLayout() {
  return <Outlet />;
}
