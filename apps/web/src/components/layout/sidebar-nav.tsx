import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { GiFeather } from 'react-icons/gi';
import { GoBell } from 'react-icons/go';
import { GrAttachment } from 'react-icons/gr';
import { IoEarthOutline } from 'react-icons/io5';
import { LuPalette, LuCircleUser } from 'react-icons/lu';
import {
  RiCheckLine,
  RiHome4Line,
  RiLogoutBoxLine,
  RiSettings4Line,
  RiUserLine,
} from 'react-icons/ri';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/authClient';

export const SidebarNav = () => {
  const { data: sessionData } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const logoNav = sessionData ? '/' : '/explore';

  const navItems = sessionData
    ? [
        { to: '/', icon: RiHome4Line, label: 'Home' },
        { to: '/explore', icon: IoEarthOutline, label: 'Explore' },
        { to: '/resources', icon: GrAttachment, label: 'Resources' },
        {
          to: '/notifications',
          icon: GoBell,
          label: 'Notifications',
        },
      ]
    : [
        { to: '/explore', icon: IoEarthOutline, label: 'Explore' },
        { to: '/sign-in', icon: LuCircleUser, label: 'Sign in' },
      ];

  const handleLogout = async () => {
    await authClient.signOut();
    navigate({ to: '/explore' });
  };

  return (
    <aside
      className="w-16 bg-card border-r border-border flex flex-col
  items-center py-4 gap-2"
    >
      <Link to={logoNav} className="mb-2">
        <div className="w-10 h-10 flex items-center justify-center">
          <GiFeather className="w-8 h-8 text-primary" />
        </div>
      </Link>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.to;
          const Icon = item.icon;

          return (
            <Link key={item.to} to={item.to}>
              <Button
                variant="ghost"
                size="icon"
                className={`w-10 h-10 cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={item.label}
              >
                <Icon className="w-7 h-7" />
              </Button>
            </Link>
          );
        })}
      </nav>
      {sessionData && (
        <div className="mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-10 h-10">
                <RiUserLine className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2">
                  <LuPalette />
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <RiCheckLine
                      className={
                        theme === 'light' ? 'opacity-100' : 'opacity-0'
                      }
                    />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <RiCheckLine
                      className={theme === 'dark' ? 'opacity-100' : 'opacity-0'}
                    />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('paper')}>
                    <RiCheckLine
                      className={
                        theme === 'paper' ? 'opacity-100' : 'opacity-0'
                      }
                    />
                    Paper
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <RiSettings4Line className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 text-destructive"
              >
                <RiLogoutBoxLine className="w-4 h-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </aside>
  );
};
