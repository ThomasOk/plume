import { Link } from '@tanstack/react-router';
import type { AuthSession } from '@/lib/authClient';
import NavContainer from '@/components/layout/nav-container';

const activeClassName = 'underline decoration-2 opacity-70';

export function Navbar({ session }: Readonly<{ session: AuthSession }>) {
  return (
    <NavContainer>
      <div className="flex gap-x-4">
        <Link
          to="/"
          activeProps={{ className: activeClassName }}
          activeOptions={{ exact: true }}
        >
          Home
        </Link>
        {/* {session?.user ? <Link {...postsLinkOptions}>Posts</Link> : null} */}
      </div>

      <div className="flex gap-x-2 justify-between">
        <Link
          to="/sign-in"
          activeProps={{ className: activeClassName }}
          activeOptions={{ exact: true }}
        >
          Login
        </Link>
        <span>|</span>
        <Link
          to="/sign-up"
          activeProps={{ className: activeClassName }}
          activeOptions={{ exact: true }}
        >
          Register
        </Link>
      </div>
    </NavContainer>
  );
}
