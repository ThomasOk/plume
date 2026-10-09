import { Card, CardContent } from '@repo/ui/components/card';
import type { Author, Comment, Memo } from '@/lib/types';
import { MemoContext } from '../contexts/memo-context';
import { CommentPreview } from './comment-preview';
import { MemoActionsMenu } from './memo-actions-menu';
import { EnterFocusModeButton, MemoEditForm, useMemoEditing } from './memo-edit-form';
import { MemoHeader } from './memo-header';
import { ExpandableMarkdown } from '@/components/markdown/expandable-markdown';
import { AttachmentList } from '@/features/attachments';

interface MemoCardProps {
  memo: Memo | Comment;
  author?: Author;
  hideCommentPreview?: boolean;
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
  hideCommentPreview = false,
  ignorePins = false,
  markFeatured = false,
}: MemoCardProps) => {
  const editing = useMemoEditing();
  const { isEditing } = editing;
  const savedAttachments = memo.attachments;

  return (
    <Card
      data-testid="memo-card"
      className="py-3 rounded-xl transition-[box-shadow,border-color] duration-200 ease-out hover:shadow-md hover:border-primary/50"
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
            actions={isEditing && <EnterFocusModeButton onClick={editing.enterFocusMode} />}
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
              {'commentCount' in memo && memo.commentCount > 0 && !hideCommentPreview && (
                <CommentPreview memoId={memo.id} commentCount={memo.commentCount} />
              )}
            </MemoContext.Provider>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
