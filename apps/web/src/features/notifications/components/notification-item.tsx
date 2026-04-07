import { useNavigate } from '@tanstack/react-router';
import type { Notification } from '@/lib/types';
import { useArchiveNotification } from '../hooks/use-archive-notification';

interface NotificationItemProps {
  notification: Notification;
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const { mutate: archive } = useArchiveNotification();
  const navigate = useNavigate();

  const isUnread = notification.status === 'UNREAD';
  const memoId = notification.comment.parentId ?? notification.entityId;
  const isComment = notification.type === 'MEMO_COMMENT';
  const message = isComment ? 'commented on your memo' : 'mentioned you in a memo';

  const handleLinkClick = () => {
    if (isUnread) {
      archive({ id: notification.id });
    }
    navigate({ to: '/memos/$memoId', params: { memoId } });
  };

  return (
    <div className={`flex gap-3 p-4 rounded-lg border transition-colors ${isUnread ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
      {/* Unread indicator */}
      <div className="flex items-start pt-1.5 shrink-0">
        <div className={`w-2 h-2 rounded-full mt-0.5 ${isUnread ? 'bg-primary' : 'bg-transparent'}`} />
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={handleLinkClick}>
        <p className="text-sm">
          <span className="font-medium">{notification.sender.name}</span>
          <span className="text-muted-foreground"> {message}</span>
        </p>

        {/* Preview — only shown for comments */}
        {isComment && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2 hover:text-foreground transition-colors">
            {notification.comment.content}
          </p>
        )}

        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(notification.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

    </div>
  );
};
