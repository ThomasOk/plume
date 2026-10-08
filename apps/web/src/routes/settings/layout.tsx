import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { SettingsNav } from '@/components/layout/settings-nav';
import { authClient } from '@/lib/authClient';

export const Route = createFileRoute('/settings')({
  // Guards every section at once. The visitor comes back to the address they asked for,
  // so a link to a section (in an email, say) still lands there after signing in.
  beforeLoad: async ({ location }) => {
    const { data } = await authClient.getSession();

    if (!data?.user) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
    }
  },
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        <SettingsNav className="md:w-48 md:shrink-0" />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
