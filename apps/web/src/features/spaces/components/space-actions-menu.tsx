import { zodResolver } from '@hookform/resolvers/zod';
import { may, MAX_SPACE_TITLE_CHARACTERS, renameSpaceSchema } from '@repo/api/schemas';
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
import { Button, buttonVariants } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MdMoreHoriz } from 'react-icons/md';
import { toast } from 'sonner';
import type { Space } from '@/lib/types';
import type z from 'zod';
import { useDeleteSpace } from '../hooks/use-delete-space';
import { useLeaveSpace } from '../hooks/use-leave-space';
import { useRenameSpace } from '../hooks/use-rename-space';
import { useMemosStats } from '@/features/memos';
import { errorMessage } from '@/lib/trpc-errors';

type RenameSpaceInput = z.infer<typeof renameSpaceSchema>;

interface SpaceActionsMenuProps {
  space: Space;
  /** Called once the user has left the space, or deleted it: it is no longer theirs to show. */
  onGone: () => void;
}

type OpenDialog = 'rename' | 'delete' | 'leave' | null;

/**
 * What a member may do to a space as a whole. The governance actions are absent, not
 * disabled, for a role that may not take them: a user is not offered what they cannot do.
 */
export const SpaceActionsMenu = ({ space, onGone }: SpaceActionsMenuProps) => {
  const [open, setOpen] = useState<OpenDialog>(null);
  const leave = useLeaveSpace();
  const close = () => setOpen(null);

  const mayManageMembership = may(space.role, 'manageMembership');
  const mayManageSpace = may(space.role, 'manageSpace');

  const onLeave = async () => {
    try {
      await leave.mutateAsync({ spaceId: space.id });
      onGone();
    } catch (error) {
      // The last admin is refused with a reason they can act on: show it.
      toast.error(errorMessage(error, 'Failed to leave the space'));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Space actions">
            <MdMoreHoriz className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {mayManageMembership && (
            <DropdownMenuItem asChild>
              <Link to="/spaces/$spaceId/members" params={{ spaceId: space.id }}>
                Members
              </Link>
            </DropdownMenuItem>
          )}
          {mayManageSpace && (
            <DropdownMenuItem onClick={() => setOpen('rename')}>Rename</DropdownMenuItem>
          )}
          {(mayManageMembership || mayManageSpace) && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={() => setOpen('leave')}>Leave space</DropdownMenuItem>
          {mayManageSpace && (
            <DropdownMenuItem variant="destructive" onClick={() => setOpen('delete')}>
              Delete space
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {mayManageSpace && (
        <>
          <RenameSpaceDialog space={space} open={open === 'rename'} onClose={close} />
          <DeleteSpaceDialog
            space={space}
            open={open === 'delete'}
            onClose={close}
            onDeleted={onGone}
          />
        </>
      )}

      <AlertDialog open={open === 'leave'} onOpenChange={(next) => !next && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {space.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer read this space. The memos you wrote stay in it, under your
              name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onLeave}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

interface SpaceDialogProps {
  space: { id: string; title: string };
  open: boolean;
  onClose: () => void;
}

const RenameSpaceDialog = ({ space, open, onClose }: SpaceDialogProps) => {
  const rename = useRenameSpace();
  const form = useForm<RenameSpaceInput>({
    resolver: zodResolver(renameSpaceSchema),
    values: { title: space.title },
  });

  const onSubmit = async (values: RenameSpaceInput) => {
    try {
      await rename.mutateAsync({ spaceId: space.id, ...values });
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to rename the space'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename space</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              name="title"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={MAX_SPACE_TITLE_CHARACTERS}
                      autoComplete="off"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Rename
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const DeleteSpaceDialog = ({
  space,
  open,
  onClose,
  onDeleted,
}: SpaceDialogProps & { onDeleted: () => void }) => {
  const deleteSpace = useDeleteSpace();
  // The space's Activity, summed: the number of memos about to go. Fetched only when asked.
  const stats = useMemosStats({ scope: { kind: 'space', spaceId: space.id }, enabled: open });
  // Without it — still loading, or failed — the dialog names the memos without a number.
  const memoCount = stats.data
    ? Object.values(stats.data).reduce((sum, count) => sum + count, 0)
    : undefined;

  const onDelete = async () => {
    try {
      await deleteSpace.mutateAsync({ spaceId: space.id });
      onDeleted();
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to delete the space'));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {space.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the space
            {memoCount === undefined
              ? ', its memos and their comments'
              : `, its ${memoCount} ${memoCount === 1 ? 'memo' : 'memos'} and their comments`}
            , whoever wrote them. Every member loses access. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            disabled={stats.isLoading || deleteSpace.isPending}
            onClick={onDelete}
          >
            Delete space
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
