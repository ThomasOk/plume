import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import type { Comment } from '@/lib/types';
import { MemoContext } from '../contexts/memo-context';
import { MemoActionsMenu } from './memo-actions-menu';
import { EnterFocusModeButton, MemoEditForm, useMemoEditing } from './memo-edit-form';
import { ReactButton, ReactionRow } from './reactions';
import { RelativeDate } from './relative-date';
import { ExpandableMarkdown } from '@/components/markdown/expandable-markdown';
import { AttachmentList } from '@/features/attachments';
import { useAuth } from '@/features/auth/hooks/use-auth';

// About five lines of text: a short reply shows whole, a long one leaves room for the next.
const CLAMPED_HEIGHT = 120;

interface CompactCommentProps {
  comment: Comment;
}

/**
 * A comment as one turn of the conversation on its memo's page: who wrote it and when on
 * one line, then the text. Its actions, its edit form and its reactions are the memo card's,
 * so the same rules decide who edits, who deletes and who reacts.
 */
export const CompactComment = ({ comment }: CompactCommentProps) => {
  const editing = useMemoEditing();
  const { isEditing } = editing;
  const { user } = useAuth();
  const { author } = comment;

  return (
    // The id is the comment's anchor, which the strip under the card in a list links to.
    // Hovering or focusing the comment shows its react button, as on a memo's card.
    <article id={comment.id} className="group/memo scroll-mt-6 flex gap-3 py-3">
      <Avatar className="size-7 shrink-0">
        <AvatarImage src={author.image ?? undefined} />
        <AvatarFallback className="text-xs">{author.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 min-h-7">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-sm font-medium truncate">{author.name}</span>
            <RelativeDate date={comment.createdAt} className="shrink-0" />
          </div>
          {isEditing ? (
            <EnterFocusModeButton onClick={editing.enterFocusMode} />
          ) : (
            <div className="flex items-center gap-1 pointer-coarse:gap-4 shrink-0">
              {user && <ReactButton memoId={comment.id} reactions={comment.reactions} />}
              <MemoActionsMenu memo={comment} author={author} onEdit={editing.startEditing} />
            </div>
          )}
        </div>

        <MemoEditForm memo={comment} editing={editing} />
        {!isEditing && (
          <MemoContext.Provider value={{ memo: comment }}>
            <ExpandableMarkdown content={comment.content} maxHeight={CLAMPED_HEIGHT} />
            {comment.attachments.length > 0 && (
              <AttachmentList savedAttachments={comment.attachments} />
            )}
            <ReactionRow memoId={comment.id} reactions={comment.reactions} readerId={user?.id ?? null} />
          </MemoContext.Provider>
        )}
      </div>
    </article>
  );
};
