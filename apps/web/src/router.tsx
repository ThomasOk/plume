import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter as createTanstackRouter } from '@tanstack/react-router';
import { queryClient } from '@/lib/queryClient';
import { trpcClient } from '@/lib/trpcClient';
import { TRPCProvider } from '@/lib/api';
import { env } from '@/env';
import { routeTree } from '@/routeTree.gen';
import Spinner from '@/components/ui/spinner';

export function createRouter() {
  const router = createTanstackRouter({
    routeTree,
    basepath: env.PUBLIC_BASE_PATH,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPendingComponent: () => <Spinner />,
    Wrap: function WrapComponent({ children }) {
      return (
        <QueryClientProvider client={queryClient}>
          <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
            {children}
          </TRPCProvider>
        </QueryClientProvider>
      );
    },
  });
  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
