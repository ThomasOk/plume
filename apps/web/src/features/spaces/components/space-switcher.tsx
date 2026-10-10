import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { LuChevronsUpDown, LuPlus } from 'react-icons/lu';
import { RiCheckLine } from 'react-icons/ri';
import { useSpaces } from '../hooks/use-spaces';
import { CreateSpaceDialog } from './create-space-dialog';
import { useMemoScope } from '@/features/memos';
import { useMenuSounds } from '@/hooks/use-menu-sounds';
import { authClient } from '@/lib/authClient';

/**
 * Moves between the user's personal memos and each space they are a member of. It sits
 * above the Activity and Tag tree panels, which follow the scope it selects.
 */
export const SpaceSwitcher = () => {
  const { data: session } = authClient.useSession();
  const { pathname } = useLocation();
  const isExplore = pathname.startsWith('/explore');
  const scope = useMemoScope();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const { onOpenChange, choose } = useMenuSounds();
  const { data: spaces } = useSpaces({ enabled: !!session && !isExplore });

  // Explore is outside every scope: there is nothing to switch between.
  if (!session || isExplore) return null;

  const currentSpaceId = scope.kind === 'space' ? scope.spaceId : undefined;
  const currentLabel = currentSpaceId
    ? (spaces?.find((s) => s.id === currentSpaceId)?.title ?? 'Space')
    : 'Personal';

  return (
    <>
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            aria-label="Switch space"
            className="w-full justify-between font-medium"
          >
            <span className="truncate">{currentLabel}</span>
            <LuChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          <DropdownMenuItem asChild onClick={choose}>
            <Link to="/" className="flex items-center gap-2">
              <RiCheckLine className={currentSpaceId ? 'opacity-0' : 'opacity-100'} />
              Personal
            </Link>
          </DropdownMenuItem>
          {spaces && spaces.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Spaces</DropdownMenuLabel>
              {spaces.map((space) => (
                <DropdownMenuItem key={space.id} asChild onClick={choose}>
                  <Link
                    to="/spaces/$spaceId"
                    params={{ spaceId: space.id }}
                    className="flex items-center gap-2"
                  >
                    <RiCheckLine
                      className={space.id === currentSpaceId ? 'opacity-100' : 'opacity-0'}
                    />
                    <span className="truncate">{space.title}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setIsCreating(true)}
            className="flex items-center gap-2"
          >
            <LuPlus />
            New space…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateSpaceDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        onCreated={(space) => {
          setIsCreating(false);
          navigate({ to: '/spaces/$spaceId', params: { spaceId: space.id } });
        }}
      />
    </>
  );
};
