import { Link } from '@tanstack/react-router';
import { useComments } from '../hooks';

interface CommentPreviewProps {
  memoId: string;
  commentCount: number;
}

const MAX_PREVIEW = 3;

function stripMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')    // **bold**
    .replace(/\*(.+?)\*/g, '$1')         // *italic*
    .replace(/__(.+?)__/g, '$1')         // __bold__
    .replace(/_(.+?)_/g, '$1')           // _italic_
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [link](url) → link
    .replace(/`(.+?)`/g, '$1')           // `code`
    .replace(/#{1,6}\s/g, '')            // ## headers (not #tags)
    .replace(/\n+/g, ' ')               // newlines → space
    .trim();
}

export const CommentPreview = ({ memoId, commentCount }: CommentPreviewProps) => {
  const { data: comments, isLoading } = useComments(memoId);

  if (isLoading) return null;

  const preview = comments?.slice(0, MAX_PREVIEW) ?? [];

  return (
    <div className="mt-3 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted-foreground font-medium">
          Comments ({commentCount})
        </span>
        <Link
          to="/memos/$memoId"
          params={{ memoId }}
          hash="comments"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          View all ↗
        </Link>
      </div>

      {/* Comment rows */}
      <ul className="space-y-1">
        {preview.map((comment) => (
          <li key={comment.id} className="flex items-baseline gap-1 text-muted-foreground">
            <span className="font-medium text-foreground shrink-0">
              {comment.author.name}
            </span>
            <span className="shrink-0">·</span>
            <span className="line-clamp-1">{stripMarkdown(comment.content)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
