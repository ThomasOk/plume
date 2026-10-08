import { cn } from '@repo/ui/lib/utils';
import { Link } from '@tanstack/react-router';

const sections = [
  { to: '/settings/account', label: 'Account' },
  { to: '/settings/security', label: 'Security' },
  { to: '/settings/notifications', label: 'Notifications' },
  { to: '/settings/export', label: 'Export' },
] as const;

// A side column on wide screens, a row of tabs on a phone: four short labels fit a narrow
// screen side by side, and the row scrolls rather than wraps if they ever do not.
export const SettingsNav = ({ className }: { className?: string }) => (
  <nav aria-label="Settings sections" className={className}>
    <ul className="flex gap-1 overflow-x-auto border-b border-border md:flex-col md:border-b-0">
      {sections.map(({ to, label }) => (
        <li key={to} className="shrink-0">
          <Link
            to={to}
            className={cn(
              'block whitespace-nowrap px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground',
              'border-b-2 border-transparent -mb-px md:mb-0 md:border-b-0 md:rounded-md md:hover:bg-accent',
            )}
            activeProps={{
              'aria-current': 'page',
              className:
                'text-foreground font-medium border-foreground md:bg-accent',
            }}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);
