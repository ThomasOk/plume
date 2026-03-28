import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createRoute,
  createMemoryHistory,
  Outlet,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';

export async function renderWithRouter(component: React.ReactNode) {
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
    history: createMemoryHistory(),
    defaultPendingMinMs: 0,
  });

  render(<RouterProvider router={router} />);

  await screen.findByRole('main').catch(() => null);
}
