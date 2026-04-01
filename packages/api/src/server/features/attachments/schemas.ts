import { z } from 'zod';

const MAX_FILENAME_LENGTH = 255;

export const getUploadUrlSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(MAX_FILENAME_LENGTH)
    .refine((name) => !name.includes('/') && !name.includes('\\'), {
      message: 'Filename cannot contain path separators',
    }),
  mimeType: z.string().min(1).max(255),
  size: z.number().int().positive(),
});

export const confirmUploadSchema = z.object({
  id: z.string().min(1),
  memoId: z.string().optional(),
});

export const deleteAttachmentSchema = z.object({
  id: z.string().min(1),
});

export const listAttachmentsSchema = z.object({
  memoId: z.string().optional(),
});

export const listByMemoSchema = z.object({
  memoId: z.string().min(1),
});
