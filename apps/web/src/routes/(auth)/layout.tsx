import { Button } from '@repo/ui/components/button';
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
} from '@tanstack/react-router';
import LogoSvg from '/logo.svg';
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
  const { pathname } = useLocation();
  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-screen-2xl p-4">
        {/* <img src={LogoSvg} alt="RT Stack" className="h-12 w-auto" /> */}
        <nav className="flex justify-between items-center">
          <img src={LogoSvg} alt="logo" width={100} height={50} />
          <Button asChild variant="secondary">
            <Link to={pathname === '/sign-in' ? '/sign-up' : '/sign-in'}>
              {pathname === '/sign-in' ? 'Sign Up' : 'Login'}
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
