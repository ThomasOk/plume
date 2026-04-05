import { eq, and, desc } from '@repo/db';
import { attachment, memo } from '@repo/db/schema';
import { nanoid } from 'nanoid';
import type {
  getUploadUrlSchema,
  confirmUploadSchema,
  deleteAttachmentSchema,
  listAttachmentsSchema,
  listByMemoSchema,
} from './attachments-schemas';
import type { StorageService } from '../../shared/storage';
import type { DatabaseInstance } from '@repo/db/client';
import type { z } from 'zod';
import {
  AttachmentNotFoundError,
  InsufficientPermissionsError,
  FileSizeLimitExceededError,
  MemoNotFoundError,
} from '../../shared/errors';

type GetUploadUrlInput = z.infer<typeof getUploadUrlSchema>;
type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
type DeleteAttachmentInput = z.infer<typeof deleteAttachmentSchema>;
type ListAttachmentsInput = z.infer<typeof listAttachmentsSchema>;
type ListByMemoInput = z.infer<typeof listByMemoSchema>;

const UPLOAD_SIZE_LIMIT_BYTES = 30 * 1024 * 1024;

export async function getUploadUrl(
  db: DatabaseInstance,
  storage: StorageService,
  userId: string,
  input: GetUploadUrlInput,
  sizeLimitBytes = UPLOAD_SIZE_LIMIT_BYTES,
) {
  if (input.size > sizeLimitBytes) {
    throw new FileSizeLimitExceededError(
      Math.round(sizeLimitBytes / 1024 / 1024),
    );
  }

  const id = nanoid();
  const ext = input.filename.includes('.')
    ? input.filename.slice(input.filename.lastIndexOf('.'))
    : '';
  const storageKey = `uploads/${userId}/${id}${ext}`;

  const { url: uploadUrl, contentDisposition } =
    await storage.generateUploadUrl(storageKey, input.mimeType, input.filename);

  const now = new Date();
  await db.insert(attachment).values({
    id,
    userId,
    memoId: null,
    status: 'pending',
    filename: input.filename,
    storageKey,
    mimeType: input.mimeType,
    size: input.size,
    createdAt: now,
    updatedAt: now,
  });

  return { id, uploadUrl, contentDisposition, storageKey };
}

export async function confirmUpload(
  db: DatabaseInstance,
  storage: StorageService,
  userId: string,
  input: ConfirmUploadInput,
) {
  const [updated] = await db
    .update(attachment)
    .set({
      status: 'active',
      memoId: input.memoId ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(attachment.id, input.id),
        eq(attachment.userId, userId),
        eq(attachment.status, 'pending'),
      ),
    )
    .returning();

  if (!updated) throw new AttachmentNotFoundError();

  return {
    ...updated,
    url: storage.getPublicUrl(updated.storageKey),
  };
}

export async function listAttachments(
  db: DatabaseInstance,
  storage: StorageService,
  userId: string,
  input: ListAttachmentsInput | undefined,
) {
  const conditions = [
    eq(attachment.userId, userId),
    eq(attachment.status, 'active'),
  ];

  if (input?.memoId) {
    conditions.push(eq(attachment.memoId, input.memoId));
  }

  const rows = await db
    .select()
    .from(attachment)
    .where(and(...conditions))
    .orderBy(desc(attachment.createdAt));

  return rows.map((row) => ({
    ...row,
    url: storage.getPublicUrl(row.storageKey),
  }));
}

export async function deleteAttachment(
  db: DatabaseInstance,
  storage: StorageService,
  userId: string,
  input: DeleteAttachmentInput,
) {
  const [deleted] = await db
    .delete(attachment)
    .where(and(eq(attachment.id, input.id), eq(attachment.userId, userId)))
    .returning();

  if (!deleted) throw new AttachmentNotFoundError();

  await storage.deleteObject(deleted.storageKey);

  return { success: true };
}

export async function listAttachmentsByMemo(
  db: DatabaseInstance,
  storage: StorageService,
  sessionUserId: string | null,
  input: ListByMemoInput,
) {
  const [memoRow] = await db
    .select({ userId: memo.userId, visibility: memo.visibility })
    .from(memo)
    .where(eq(memo.id, input.memoId))
    .limit(1);

  if (!memoRow) throw new MemoNotFoundError();

  if (memoRow.visibility === 'private') {
    if (!sessionUserId || sessionUserId !== memoRow.userId) {
      throw new InsufficientPermissionsError();
    }
  }

  const rows = await db
    .select()
    .from(attachment)
    .where(
      and(eq(attachment.memoId, input.memoId), eq(attachment.status, 'active')),
    )
    .orderBy(desc(attachment.createdAt));

  return rows.map((row) => ({
    ...row,
    url: storage.getPublicUrl(row.storageKey),
  }));
}
