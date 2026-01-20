import { Link, useRouterState } from '@tanstack/react-router';
import { GiFeather } from 'react-icons/gi';
import {
  RiQuillPenLine,
  RiCompass3Line,
  RiAttachmentLine,
  RiBellLine,
  RiSettings4Line,
  RiLogoutBoxLine,
  RiUserLine,
} from 'react-icons/ri';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { authClient } from '@/lib/authClient';

const navItems = [
  { to: '/', icon: RiQuillPenLine, label: 'Home' },
  { to: '/explore', icon: RiCompass3Line, label: 'Explore' },
  { to: '/resources', icon: RiAttachmentLine, label: 'Resources' },
  { to: '/notifications', icon: RiBellLine, label: 'Notifications' },
];

export const SidebarNav = () => {
  const router = useRouterState();

  const handleLogout = async () => {
    await authClient.signOut();
  };

  return (
    <aside
      className="w-16 bg-card border-r border-border flex flex-col
  items-center py-4 gap-2"
    >
      <Link to="/" className="mb-2">
        <div className="w-10 h-10 flex items-center justify-center">
          <GiFeather className="w-8 h-8 text-primary" />
        </div>
      </Link>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = router.location.pathname === item.to;
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

      <div className="mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-10 h-10">
              <RiUserLine className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right">
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
    </aside>
  );
};
