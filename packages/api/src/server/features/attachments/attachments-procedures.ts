import { protectedProcedure, publicProcedure } from '../../trpc';
import {
  getUploadUrlSchema,
  confirmUploadSchema,
  deleteAttachmentSchema,
  listAttachmentsSchema,
  listByMemoSchema,
} from './attachments-schemas';
import {
  getUploadUrl as getUploadUrlService,
  confirmUpload as confirmUploadService,
  listAttachments,
  deleteAttachment as deleteAttachmentService,
  listAttachmentsByMemo,
} from './attachments-service';

export const getUploadUrl = protectedProcedure
  .input(getUploadUrlSchema)
  .mutation(({ ctx, input }) =>
    getUploadUrlService(
      ctx.db,
      ctx.storage,
      ctx.session.user.id,
      input,
      (ctx as { uploadSizeLimitBytes?: number }).uploadSizeLimitBytes,
    ),
  );

export const confirmUpload = protectedProcedure
  .input(confirmUploadSchema)
  .mutation(({ ctx, input }) => confirmUploadService(ctx.db, ctx.storage, ctx.session.user.id, input));

export const list = protectedProcedure
  .input(listAttachmentsSchema.optional())
  .query(({ ctx, input }) => listAttachments(ctx.db, ctx.storage, ctx.session.user.id, input));

export const deleteAttachment = protectedProcedure
  .input(deleteAttachmentSchema)
  .mutation(({ ctx, input }) => deleteAttachmentService(ctx.db, ctx.storage, ctx.session.user.id, input));

export const listByMemo = publicProcedure
  .input(listByMemoSchema)
  .query(({ ctx, input }) =>
    listAttachmentsByMemo(ctx.db, ctx.storage, ctx.session?.user.id ?? null, input),
  );
