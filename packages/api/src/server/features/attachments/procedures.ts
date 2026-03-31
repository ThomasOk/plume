import { eq, and, desc } from '@repo/db';
import { attachment } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';
import { protectedProcedure } from '../../trpc';
import {
  getUploadUrlSchema,
  confirmUploadSchema,
  deleteAttachmentSchema,
  listAttachmentsSchema,
} from './schemas';

// Returns a presigned PUT URL so the client can upload directly to R2,
// and persists the attachment row in "pending" state.
export const getUploadUrl = protectedProcedure
  .input(getUploadUrlSchema)
  .mutation(async ({ ctx, input }) => {
    const limitBytes = (ctx as { uploadSizeLimitBytes?: number }).uploadSizeLimitBytes ?? 30 * 1024 * 1024;
    if (input.size > limitBytes) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `File size exceeds the ${Math.round(limitBytes / 1024 / 1024)} MB limit`,
      });
    }

    const id = nanoid();
    const ext = input.filename.includes('.')
      ? input.filename.slice(input.filename.lastIndexOf('.'))
      : '';
    const storageKey = `uploads/${ctx.session.user.id}/${id}${ext}`;

    const { url: uploadUrl, contentDisposition } = await ctx.storage.generateUploadUrl(
      storageKey,
      input.mimeType,
      input.filename,
    );

    const now = new Date();
    await ctx.db.insert(attachment).values({
      id,
      userId: ctx.session.user.id,
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
  });

// Called after the client PUT to R2 succeeds — marks the attachment as active
// and optionally links it to a memo.
export const confirmUpload = protectedProcedure
  .input(confirmUploadSchema)
  .mutation(async ({ ctx, input }) => {
    const [updated] = await ctx.db
      .update(attachment)
      .set({
        status: 'active',
        memoId: input.memoId ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(attachment.id, input.id),
          eq(attachment.userId, ctx.session.user.id),
          eq(attachment.status, 'pending'),
        ),
      )
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Attachment not found or already confirmed',
      });
    }

    return {
      ...updated,
      url: ctx.storage.getPublicUrl(updated.storageKey),
    };
  });

// Returns active attachments for the current user, optionally filtered by memo.
export const list = protectedProcedure
  .input(listAttachmentsSchema.optional())
  .query(async ({ ctx, input }) => {
    const conditions = [
      eq(attachment.userId, ctx.session.user.id),
      eq(attachment.status, 'active'),
    ];

    if (input?.memoId) {
      conditions.push(eq(attachment.memoId, input.memoId));
    }

    const rows = await ctx.db
      .select()
      .from(attachment)
      .where(and(...conditions))
      .orderBy(desc(attachment.createdAt));

    return rows.map((row) => ({
      ...row,
      url: ctx.storage.getPublicUrl(row.storageKey),
    }));
  });

export const deleteAttachment = protectedProcedure
  .input(deleteAttachmentSchema)
  .mutation(async ({ ctx, input }) => {
    const [deleted] = await ctx.db
      .delete(attachment)
      .where(
        and(
          eq(attachment.id, input.id),
          eq(attachment.userId, ctx.session.user.id),
        ),
      )
      .returning();

    if (!deleted) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Attachment not found',
      });
    }

    await ctx.storage.deleteObject(deleted.storageKey);

    return { success: true };
  });
