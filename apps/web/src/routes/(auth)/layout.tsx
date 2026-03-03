import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { authClient } from '@/lib/authClient';

export const Route = createFileRoute('/(auth)')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();

    if (data?.user) {
      throw redirect({ to: '/' });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <main className="min-h-screen flex justify-center items-center flex-1">
      <Outlet />
    </main>
  );
}
