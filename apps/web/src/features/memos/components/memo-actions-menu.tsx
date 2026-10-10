import {
  mayDeleteMemo,
  mayDeletePublicMemo,
  mayEditMemo,
  mayFeatureMemo,
  mayPinMemo,
} from '@repo/api/schemas';
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
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import {
  MdMoreVert,
  MdOutlineAutoAwesome,
  MdOutlineDelete,
  MdOutlineEdit,
  MdOutlineOpenInNew,
  MdOutlinePushPin,
} from 'react-icons/md';
import { toast } from 'sonner';
import type { Author, Comment, Memo } from '@/lib/types';
import {
  useDeleteComment,
  useDeleteMemo,
  useFeatureMemo,
  usePinMemo,
  useUnfeatureMemo,
  useUnpinMemo,
} from '../hooks';
import { MoveMemoSubmenu } from './move-memo-submenu';
import { useAuth } from '@/features/auth/hooks/use-auth';
// The hook's own module, not the feature's index: `spaces` already imports from `memos`.
import { useSpace } from '@/features/spaces/hooks/use-space';
import { sounds } from '@/lib/sounds';

interface MemoActionsMenuProps {
  memo: Memo | Comment;
  /** Named in the delete dialog when the user deletes someone else's memo. */
  author?: Author;
  /** Leave the pin action out, where the list is no one's scope (ADR 0006). */
  ignorePins?: boolean;
  onEdit: () => void;
}

/**
 * What the user may do with a memo or a comment, and the dialog confirming a delete.
 * Renders nothing on a comment the user may not delete, its only action.
 */
export const MemoActionsMenu = ({
  memo,
  author,
  ignorePins = false,
  onEdit,
}: MemoActionsMenuProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { user } = useAuth();
  const isAuthor = user?.id === memo.userId;
  // The memo names its space, so the menu knows it wherever the memo is shown — in its
  // space's list or on its own page. The role there decides what the user may do: an admin
  // may delete another member's memo, never edit it. On the space's page, the query is
  // already in the cache.
  const space = useSpace(memo.spaceId ?? undefined);
  const actor = { isAuthor, role: space.data?.role ?? null };
  // Whether the user runs the instance, for what the operator policy decides apart.
  const operator = { isOperator: user?.isOperator ?? false };
  const isPublic = memo.visibility === 'public';
  const mayEdit = mayEditMemo(actor);
  const isComment = !!memo.parentId;
  // An operator may also delete any memo Explore shows, or a comment on one, which carries
  // its memo's visibility. Asked of each policy apart, as the server does (ADR 0007).
  const mayDelete = mayDeleteMemo(actor) || mayDeletePublicMemo(operator, { isPublic });
  const deleteMemo = useDeleteMemo();
  const deleteComment = useDeleteComment(memo.parentId ?? '');
  const deleteAction = isComment ? deleteComment : deleteMemo;

  // A pin is decided by whoever governs the memo's scope — an admin in a space, the author
  // out of one — and a comment has no scope of its own to be pinned in.
  const isPinned = memo.pinnedAt !== null;
  const mayPin = !isComment && !ignorePins && mayPinMemo(actor);
  const pinMemo = usePinMemo();
  const unpinMemo = useUnpinMemo();
  // Each call names the state it wants, so a double click cannot toggle the pin back. The
  // memo changes place in the list, out of sight perhaps: the toast says it happened.
  const togglePin = () => {
    sounds.tick();
    const [mutation, done] = isPinned ? [unpinMemo, 'Memo unpinned'] : [pinMemo, 'Memo pinned'];
    mutation.mutate(
      { id: memo.id },
      {
        onSuccess: () => toast.success(done),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  // Featuring is the operator's decision, whoever wrote the memo, and only a public memo
  // that is not a comment stands on Explore to be featured. Offered wherever the memo is
  // shown, so an operator features a memo right where they wrote it.
  const isFeatured = memo.featuredAt !== null;
  const mayFeature = !isComment && isPublic && mayFeatureMemo(operator);
  const featureMemo = useFeatureMemo();
  const unfeatureMemo = useUnfeatureMemo();
  const toggleFeatured = () => {
    sounds.tick();
    const [mutation, done] = isFeatured
      ? [unfeatureMemo, 'Memo unfeatured']
      : [featureMemo, 'Memo featured on Explore'];
    mutation.mutate(
      { id: memo.id },
      {
        onSuccess: () => toast.success(done),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const handleDelete = () => {
    deleteAction.mutate(
      { id: memo.id },
      {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          toast.success(isComment ? 'Comment deleted successfully' : 'Memo deleted successfully');
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  if (isComment && !mayDelete) return null;

  return (
    <>
      <DropdownMenu onOpenChange={(open) => { if (open) sounds.pop(); }}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hit-area relative h-8 w-8"
            aria-label={isComment ? 'Comment actions' : 'Memo actions'}
          >
            <MdMoreVert className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isComment && (
            <DropdownMenuItem asChild>
              <Link to="/memos/$memoId" params={{ memoId: memo.id }}>
                <MdOutlineOpenInNew className="size-4" />
                Open
              </Link>
            </DropdownMenuItem>
          )}
          {mayPin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={pinMemo.isPending || unpinMemo.isPending}
                onClick={togglePin}
              >
                <MdOutlinePushPin className="size-4" />
                {isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
            </>
          )}
          {mayFeature && (
            <>
              {!mayPin && <DropdownMenuSeparator />}
              <DropdownMenuItem
                disabled={featureMemo.isPending || unfeatureMemo.isPending}
                onClick={toggleFeatured}
              >
                <MdOutlineAutoAwesome className="size-4" />
                {isFeatured ? 'Unfeature' : 'Feature'}
              </DropdownMenuItem>
            </>
          )}
          {mayDelete && (
            <>
              {!isComment && <DropdownMenuSeparator />}
              {mayEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <MdOutlineEdit className="size-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {/* Only the author moves a memo: it changes who reads their words. */}
              {isAuthor && !isComment && <MoveMemoSubmenu memo={memo} />}
              <DropdownMenuItem
                onClick={() => { sounds.warning(); setIsDeleteDialogOpen(true); }}
              >
                <MdOutlineDelete className="size-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isComment ? 'Are you sure you want to delete this comment?' : 'Are you sure you want to delete this memo?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{' '}
              {isAuthor ? 'your' : `${author?.name ?? 'this member'}’s`}{' '}
              {isComment ? 'comment' : 'memo'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteAction.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                sounds.click();
                handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
