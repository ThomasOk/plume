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
import { cn } from '@repo/ui/lib/utils';
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

interface SidebarNavProps {
  collapsed?: boolean;
  className?: string;
}

export const SidebarNav = ({
  collapsed = true,
  className,
}: SidebarNavProps) => {
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
      className={cn(
        'flex flex-col gap-1',
        collapsed
          ? 'w-16 items-center py-4 bg-card border-r border-border'
          : 'w-full items-start pt-3 pb-2 h-full',
        className,
      )}
    >
      <Link
        to={logoNav}
        className={cn(
          'flex items-center mb-4',
          collapsed ? 'justify-center w-10 h-10' : 'gap-3 px-4 py-2',
        )}
      >
        <GiFeather className="w-6 h-6 text-primary shrink-0" />
        {!collapsed && <span className="font-bold text-xl">Plume</span>}
      </Link>

      <nav
        className={cn(
          'flex flex-col gap-1 w-full',
          collapsed && 'items-center',
        )}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.to;
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={collapsed ? '' : 'w-full'}
            >
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'default'}
                className={cn(
                  'cursor-pointer',
                  collapsed
                    ? 'w-10 h-10'
                    : 'w-full justify-start gap-4 px-4 h-11 text-base',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-6 h-6 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>
      {sessionData && (
        <div className="mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'default'}
                className={cn(
                  collapsed
                    ? 'w-10 h-10'
                    : 'w-full justify-start gap-4 px-4 h-11 text-base text-muted-foreground hover:text-foreground',
                )}
              >
                <RiUserLine className="w-6 h-6 shrink-0" />
                {!collapsed && <span>{sessionData.user.name}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side={collapsed ? 'right' : 'top'}>
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
