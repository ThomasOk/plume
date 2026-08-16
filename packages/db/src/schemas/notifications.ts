import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { user } from './auth';
import { memo } from './memos';

export const notificationStatusEnum = pgEnum('notification_status', [
  'UNREAD',
  'ARCHIVED',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'MEMO_COMMENT',
]);

export const notification = pgTable('notification', {
  id: text('id').primaryKey(),
  senderId: text('sender_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  receiverId: text('receiver_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  // The entity that triggered the notification (e.g. the comment memo id).
  // Unique so `persistNotification` can dedupe via insert-on-conflict-do-nothing:
  // the outbox delivers at-least-once, and this constraint makes replays a no-op.
  entityId: text('entity_id')
    .notNull()
    .unique()
    .references(() => memo.id, { onDelete: 'cascade' }),
  status: notificationStatusEnum('status').notNull().default('UNREAD'),
  createdAt: timestamp('created_at').notNull(),
});

export const selectNotificationSchema = createSelectSchema(notification);

export type Notification = typeof notification.$inferSelect;
