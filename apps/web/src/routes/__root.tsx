import { Toaster } from '@repo/ui/components/sonner';
import {
  Outlet,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router';
import React from 'react';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import Spinner from '@/components/ui/spinner';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/authClient';
import { MobileHeader } from '@/components/layout/mobile-header';

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
  const matches = useRouterState({ select: (s) => s.matches });
  const isAuthPage = matches.some((match) => match.routeId === '/(auth)');

  if (isPending) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <Toaster theme={theme === 'dark' ? 'dark' : 'light'} />
      <div className="flex h-screen">
        {!isAuthPage && <SidebarNav className="hidden md:flex" />}
        <div className="flex flex-col flex-1 overflow-hidden">
          {!isAuthPage && <MobileHeader />}
          <main className="flex-1 overflow-auto p-4">
            <Outlet />
          </main>
        </div>
      </div>
      <React.Suspense>
        <TanStackRouterDevtools position="bottom-right" />
      </React.Suspense>
    </>
  );
}
