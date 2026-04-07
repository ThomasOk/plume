import { notification } from '@repo/db/schema';
import { nanoid } from 'nanoid';
import type { DatabaseInstance } from '@repo/db/client';

export async function createMentionNotification(
  db: DatabaseInstance,
  senderId: string,
  memoId: string,
  receiverId: string,
): Promise<void> {
  await db.insert(notification).values({
    id: nanoid(),
    senderId,
    receiverId,
    type: 'MEMO_MENTION',
    entityId: memoId,
    status: 'UNREAD',
    createdAt: new Date(),
  });
}

export async function createCommentNotification(
  db: DatabaseInstance,
  senderId: string,
  memoId: string,
  receiverId: string,
): Promise<void> {
  await db.insert(notification).values({
    id: nanoid(),
    senderId,
    receiverId,
    type: 'MEMO_COMMENT',
    entityId: memoId,
    status: 'UNREAD',
    createdAt: new Date(),
  });
}
