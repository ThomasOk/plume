import { eq, memo, notification } from '@repo/db';
import { nanoid } from 'nanoid';
import type { CommentCreatedPayload } from '../../events/domain-events';
import type { DatabaseInstance } from '@repo/db/client';

// Reaction to `comment.created`: writes the notification for the parent memo's author.
// This is the decoupled home of what `createMemo` used to do inline — the notification
// policy (who to notify, and whether to) now lives here, not in the comment producer.
export function createPersistNotificationHandler(db: DatabaseInstance) {
  return async function persistNotification(payload: CommentCreatedPayload): Promise<void> {
    const { commentId, parentMemoId, authorId } = payload;

    // Derive the receiver — a policy decision, which is why it is not in the event payload.
    const [parent] = await db
      .select({ authorId: memo.userId })
      .from(memo)
      .where(eq(memo.id, parentMemoId))
      .limit(1);

    // Parent gone (e.g. deleted before the drain): nothing to notify.
    if (!parent) return;

    // Policy: never notify someone about a comment on their own memo.
    if (parent.authorId === authorId) return;

    // Idempotent: the outbox delivers at-least-once, so a replay must not create a second
    // notification. The unique constraint on entity_id makes the conflicting insert a no-op.
    await db
      .insert(notification)
      .values({
        id: nanoid(),
        senderId: authorId,
        receiverId: parent.authorId,
        type: 'MEMO_COMMENT',
        entityId: commentId,
        status: 'UNREAD',
        createdAt: new Date(),
      })
      .onConflictDoNothing({ target: notification.entityId });
  };
}
