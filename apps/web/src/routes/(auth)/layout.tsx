import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router';
import LogoSvg from '/logo.svg';
import { Button } from '@repo/ui/components/button';

export const Route = createFileRoute('/(auth)')({
  component: AuthLayout,
});

function AuthLayout() {
  const { pathname } = useLocation();
  return (
    <main className="bg-neutral-100 min-h-screen">
      <div className="mx-auyo max-w-screen-2xl p-4">
        {/* <img src={LogoSvg} alt="RT Stack" className="h-12 w-auto" /> */}
        <nav className="flex justify-between items-center">
          <img src={LogoSvg} alt="logo" width={100} height={50} />
          <Button asChild variant="secondary">
            <Link to={pathname === '/login' ? '/register' : '/login'}>
              {pathname === '/login' ? 'Sign Up' : 'Login'}
            </Link>
          </Button>
        </nav>
        <div className="flex flex-col items-center justify-center pt-4 md:pt-14">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
