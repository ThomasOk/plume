import { desc, eq, and } from '@repo/db';
import type { DatabaseInstance } from '@repo/db/client';
import { notification, memo, user } from '@repo/db/schema';
import { NotificationNotFoundError } from '../../shared/errors';
import type { archiveNotificationSchema, deleteNotificationSchema } from './notifications-schemas';
import type { z } from 'zod';

type ArchiveNotificationInput = z.infer<typeof archiveNotificationSchema>;
type DeleteNotificationInput = z.infer<typeof deleteNotificationSchema>;

export async function listNotifications(db: DatabaseInstance, userId: string) {
  const sender = user;
  const comment = memo;

  const rows = await db
    .select({
      id: notification.id,
      type: notification.type,
      status: notification.status,
      createdAt: notification.createdAt,
      entityId: notification.entityId,
      senderName: sender.name,
      senderImage: sender.image,
      commentContent: comment.content,
      commentParentId: comment.parentId,
    })
    .from(notification)
    .innerJoin(sender, eq(notification.senderId, sender.id))
    .innerJoin(comment, eq(notification.entityId, comment.id))
    .where(eq(notification.receiverId, userId))
    .orderBy(desc(notification.createdAt));

  return rows.map(({ senderName, senderImage, commentContent, commentParentId, ...notif }) => ({
    ...notif,
    sender: { name: senderName ?? 'Unknown', image: senderImage ?? null },
    comment: { content: commentContent, parentId: commentParentId },
  }));
}

export async function markAsArchived(
  db: DatabaseInstance,
  userId: string,
  input: ArchiveNotificationInput,
) {
  const [updated] = await db
    .update(notification)
    .set({ status: 'ARCHIVED' })
    .where(
      and(
        eq(notification.id, input.id),
        eq(notification.receiverId, userId),
      ),
    )
    .returning();

  if (!updated) throw new NotificationNotFoundError();

  return updated;
}

export async function markAllAsArchived(db: DatabaseInstance, userId: string) {
  await db
    .update(notification)
    .set({ status: 'ARCHIVED' })
    .where(
      and(
        eq(notification.receiverId, userId),
        eq(notification.status, 'UNREAD'),
      ),
    );

  return { success: true };
}

export async function deleteNotification(
  db: DatabaseInstance,
  userId: string,
  input: DeleteNotificationInput,
) {
  const [deleted] = await db
    .delete(notification)
    .where(
      and(
        eq(notification.id, input.id),
        eq(notification.receiverId, userId),
      ),
    )
    .returning();

  if (!deleted) throw new NotificationNotFoundError();

  return { success: true };
}
