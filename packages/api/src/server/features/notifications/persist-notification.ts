import { notification } from '@repo/db';
import { nanoid } from 'nanoid';
import type { CommentCreatedPayload } from '../../events/domain-events';
import type { DatabaseInstance } from '@repo/db/client';
import { resolveCommentRecipient } from './comment-recipient';

// Reaction to `comment.created`: writes the notification for the parent memo's author.
// This is the decoupled home of what `createMemo` used to do inline. The receiver and the
// self-comment policy are derived by `resolveCommentRecipient`, shared with the email
// reaction so the two channels can never disagree about who (if anyone) to react to.
export function createPersistNotificationHandler(db: DatabaseInstance) {
  return async function persistNotification(payload: CommentCreatedPayload): Promise<void> {
    const recipient = await resolveCommentRecipient(db, payload);
    if (!recipient) return;

    // Idempotent: the outbox delivers at-least-once, so a replay must not create a second
    // notification. The unique constraint on entity_id makes the conflicting insert a no-op.
    await db
      .insert(notification)
      .values({
        id: nanoid(),
        senderId: payload.authorId,
        receiverId: recipient.id,
        type: 'MEMO_COMMENT',
        entityId: payload.commentId,
        status: 'UNREAD',
        createdAt: new Date(),
      })
      .onConflictDoNothing({ target: notification.entityId });
  };
}
