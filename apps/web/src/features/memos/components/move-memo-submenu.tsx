import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@repo/ui/components/dropdown-menu';
import { IoEarthOutline } from 'react-icons/io5';
import { MdOutlineDriveFileMove } from 'react-icons/md';
import { RiGroupLine, RiLockLine } from 'react-icons/ri';
import { toast } from 'sonner';
import type { Audience } from './audience-selector';
import type { Memo } from '@/lib/types';
import { useMoveMemo } from '../hooks/use-move-memo';
// By path rather than through the spaces barrel, which itself imports this feature.
import { useSpaces } from '@/features/spaces/hooks/use-spaces';
import { sounds } from '@/lib/sounds';

interface MoveMemoSubmenuProps {
  memo: Pick<Memo, 'id' | 'visibility'>;
}

/**
 * The audiences an author can move their memo to. A memo in a space goes out of it with
 * the audience chosen here — the move never picks one for them. A personal memo goes into
 * one of the user's spaces. Switching a personal memo between private and public is an
 * edit, and moving between two spaces is left to the API.
 */
export const MoveMemoSubmenu = ({ memo }: MoveMemoSubmenuProps) => {
  const inSpace = memo.visibility === 'space';
  const spaces = useSpaces({ enabled: !inSpace });
  const moveMemo = useMoveMemo();

  const audiences: { to: Audience; label: string; icon: typeof RiLockLine }[] = inSpace
    ? [
        { to: { kind: 'private' }, label: 'Private', icon: RiLockLine },
        { to: { kind: 'public' }, label: 'Public', icon: IoEarthOutline },
      ]
    : (spaces.data ?? []).map((space) => ({
        to: { kind: 'space', spaceId: space.id },
        label: space.title,
        icon: RiGroupLine,
      }));

  // A personal memo with no space to go to has nowhere to move.
  if (audiences.length === 0) return null;

  const move = (to: Audience) => {
    sounds.tick();
    moveMemo.mutate(
      { id: memo.id, to },
      {
        onSuccess: () => toast.success('Memo moved'),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        <MdOutlineDriveFileMove className="size-4" />
        Move to
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {audiences.map(({ to, label, icon: Icon }) => (
          <DropdownMenuItem
            key={to.kind === 'space' ? to.spaceId : to.kind}
            className="gap-2 cursor-pointer"
            disabled={moveMemo.isPending}
            onClick={() => move(to)}
          >
            <Icon className="size-4" />
            <span className="truncate max-w-56">{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
