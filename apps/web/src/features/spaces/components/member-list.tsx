import { keepsAnAdmin } from '@repo/api/schemas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Badge } from '@repo/ui/components/badge';
import { Button, buttonVariants } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { useState } from 'react';
import { MdMoreVert } from 'react-icons/md';
import { toast } from 'sonner';
import type { SpaceMember as Member } from '@/lib/types';
import { useChangeMemberRole } from '../hooks/use-change-member-role';
import { useRemoveMember } from '../hooks/use-remove-member';
import { useSpaceMembers } from '../hooks/use-space-members';
import { errorMessage } from '@/lib/trpc-errors';

interface MemberListProps {
  spaceId: string;
  spaceTitle: string;
  /** Called when the user gave up their own admin role: this page is no longer theirs. */
  onSelfDemoted: () => void;
}

/** The members of a space, for an admin to govern. */
export const MemberList = ({ spaceId, spaceTitle, onSelfDemoted }: MemberListProps) => {
  const members = useSpaceMembers(spaceId);
  const changeRole = useChangeMemberRole();
  const removeMember = useRemoveMember();
  const [removing, setRemoving] = useState<Member | null>(null);

  const onChangeRole = async (member: Member, role: Member['role']) => {
    try {
      await changeRole.mutateAsync({ spaceId, userId: member.userId, role });
      if (member.isYou && role !== 'admin') onSelfDemoted();
    } catch (error) {
      // The last admin is refused with a reason they can act on: show it.
      toast.error(errorMessage(error, 'Failed to change the role'));
    }
  };

  const onRemove = async (member: Member) => {
    try {
      await removeMember.mutateAsync({ spaceId, userId: member.userId });
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to remove the member'));
    }
  };

  if (members.isLoading) {
    return <p className="text-muted-foreground text-sm">Loading members…</p>;
  }
  if (members.error || !members.data) {
    return <p className="text-destructive text-sm">Something went wrong. Please try again.</p>;
  }

  const adminCount = members.data.filter((member) => member.role === 'admin').length;

  return (
    <>
      <ul className="divide-y rounded-md border" aria-label="Members">
        {members.data.map((member) => (
          <li key={member.userId} className="flex items-center gap-3 px-3 py-2">
            <Avatar className="size-8">
              <AvatarImage src={member.image ?? undefined} alt="" />
              <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate">
                {member.name}
                {member.isYou && <span className="text-muted-foreground"> (you)</span>}
              </p>
              <p className="text-muted-foreground text-xs truncate">{member.email}</p>
            </div>
            <Badge variant="secondary">{member.role === 'admin' ? 'Admin' : 'Member'}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Actions for ${member.name}`}
                  disabled={changeRole.isPending || removeMember.isPending}
                >
                  <MdMoreVert className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {member.role === 'admin' ? (
                  // Absent for the last admin, who would be refused: the space needs one.
                  keepsAnAdmin({ targetRole: 'admin', adminCount }) && (
                    <DropdownMenuItem onClick={() => onChangeRole(member, 'member')}>
                      Make member
                    </DropdownMenuItem>
                  )
                ) : (
                  <DropdownMenuItem onClick={() => onChangeRole(member, 'admin')}>
                    Make admin
                  </DropdownMenuItem>
                )}
                {/* Taking oneself out is leaving, offered from the space itself. */}
                {!member.isYou && (
                  <DropdownMenuItem variant="destructive" onClick={() => setRemoving(member)}>
                    Remove from space
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removing?.name} from {spaceTitle}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They will no longer read the space. The memos they wrote stay in it, under their
              name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={() => removing && onRemove(removing)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
