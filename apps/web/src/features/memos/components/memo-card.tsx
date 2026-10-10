import { Card, CardContent } from '@repo/ui/components/card';
import { cn } from '@repo/ui/lib/utils';
import type { Author, Comment, Memo } from '@/lib/types';
import { MemoContext } from '../contexts/memo-context';
import { CommentStrip } from './comment-strip';
import { MemoActionsMenu } from './memo-actions-menu';
import { EnterFocusModeButton, MemoEditForm, useMemoEditing } from './memo-edit-form';
import { MemoHeader } from './memo-header';
import { ReactButton, ReactionRow } from './reactions';
import { ExpandableMarkdown } from '@/components/markdown/expandable-markdown';
import { AttachmentList } from '@/features/attachments';
import { useAuth } from '@/features/auth/hooks/use-auth';

interface MemoCardProps {
  memo: Memo | Comment;
  author?: Author;
  /** Leave the strip of latest comments out, as on the memo's page, where they follow in full. */
  hideCommentStrip?: boolean;
  /**
   * Leave pins out, mark and action alike, where the list is no one's scope: Explore mixes
   * every author's memos, and a pin there would mean nothing to its reader (ADR 0006).
   */
  ignorePins?: boolean;
  /**
   * Show that the memo is featured where that decides its place: on Explore, and on the
   * memo's own page, which a shared link from Explore leads to. Not in a scope's list,
   * where only pins decide the order.
   */
  markFeatured?: boolean;
}

export const MemoCard = ({
  memo,
  author,
  hideCommentStrip = false,
  ignorePins = false,
  markFeatured = false,
}: MemoCardProps) => {
  const editing = useMemoEditing();
  const { isEditing } = editing;
  const { user } = useAuth();
  const savedAttachments = memo.attachments;
  const hasCommentStrip =
    'commentCount' in memo && memo.commentCount > 0 && !hideCommentStrip;

  return (
    // The card and its strip of comments hover as one, so the strip reads as part of it. Only
    // the border answers, and in no accent: the card is not a link, and must not look like one.
    <div className="group/memo">
      <Card
        data-testid="memo-card"
        className={cn(
          'py-3 rounded-xl transition-[border-color] duration-200 ease-out group-hover/memo:border-foreground/20',
          hasCommentStrip && 'rounded-b-none',
        )}
      >
        <CardContent>
          <div>
            {/* The author and date make way for the form while editing. */}
            <MemoHeader
              memo={memo}
              author={author}
              hideByline={isEditing}
              ignorePins={ignorePins}
              markFeatured={markFeatured}
              actions={
                isEditing ? (
                  <EnterFocusModeButton onClick={editing.enterFocusMode} />
                ) : (
                  user && <ReactButton memoId={memo.id} reactions={memo.reactions} />
                )
              }
              menu={
                !isEditing && (
                  <MemoActionsMenu
                    memo={memo}
                    author={author}
                    ignorePins={ignorePins}
                    onEdit={editing.startEditing}
                  />
                )
              }
            />

            {/* Memo content or edit form */}
            <MemoEditForm memo={memo} editing={editing} />
            {!isEditing && (
              <MemoContext.Provider value={{ memo }}>
                <ExpandableMarkdown content={memo.content} maxHeight={500} />
                {savedAttachments.length > 0 && (
                  <AttachmentList savedAttachments={savedAttachments} />
                )}
                <ReactionRow memoId={memo.id} reactions={memo.reactions} readerId={user?.id ?? null} />
              </MemoContext.Provider>
            )}
          </div>
        </CardContent>
      </Card>
      {hasCommentStrip && (
        <CommentStrip memoId={memo.id} commentCount={memo.commentCount} />
      )}
    </div>
  );
};
