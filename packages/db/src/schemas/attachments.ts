import { pgTable, pgEnum, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { user } from './auth';
import { memo } from './memos';

export const attachmentStatusEnum = pgEnum('attachment_status', ['pending', 'active']);

export const attachment = pgTable('attachment', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  memoId: text('memo_id').references(() => memo.id, { onDelete: 'cascade' }),
  status: attachmentStatusEnum('status').notNull().default('pending'),
  filename: text('filename').notNull(),
  storageKey: text('storage_key').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const selectAttachmentSchema = createSelectSchema(attachment);

export type Attachment = typeof attachment.$inferSelect;
