import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createRoute,
  createMemoryHistory,
  Outlet,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';

/** Renders the component at `/`, or at `path` when its hash matters, as `/#comment-1`. */
export async function renderWithRouter(component: React.ReactNode, { path = '/' } = {}) {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const testRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <>{component}</>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([testRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultPendingMinMs: 0,
  });

  render(<RouterProvider router={router} />);

  await screen.findByRole('main').catch(() => null);
}
