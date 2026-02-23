import { Toaster } from '@repo/ui/components/sonner';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import React from 'react';
import NavContainer from '@/components/layout/nav-container';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import Spinner from '@/components/ui/spinner';
import { authClient } from '@/lib/authClient';
import { useTheme } from '@/hooks/use-theme';

export const Route = createRootRoute({
  component: RootComponent,
});

// https://tanstack.com/router/v1/docs/framework/react/devtools
const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : React.lazy(() =>
      import('@tanstack/router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    );

function RootComponent() {
  const { theme } = useTheme();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <NavContainer>
        <Spinner />
      </NavContainer>
    );
  }

  return (
    <>
      <Toaster theme={theme === 'dark' ? 'dark' : 'light'} />
      <div className="flex h-screen">
        <SidebarNav />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
      <React.Suspense>
        <TanStackRouterDevtools position="bottom-right" />
      </React.Suspense>
    </>
  );
}
