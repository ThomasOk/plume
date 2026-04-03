import { insertMemoSchema, MAX_MEMO_CHARACTERS } from '@repo/db/schema';
import { stringFormat, z } from 'zod';

// Export the character limit constant for use in UI
export { MAX_MEMO_CHARACTERS };

export const createMemoSchema = insertMemoSchema.extend({
  parentId: z.string().optional(),
});

export const listCommentsSchema = z.object({
  memoId: z.string().min(1, 'Memo ID is required'),
});

export const updateMemoSchema = insertMemoSchema.extend({
  id: z.string().min(1, 'ID is required'),
});

// delete does not have schema from db
export const deleteMemoSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const getByIdSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const listMemosSchema = z.object({
  date: z.string().optional(),
  tag: z.string().optional(),
  query: z.string().optional(),
});
