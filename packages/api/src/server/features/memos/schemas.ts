import { insertMemoSchema, MAX_MEMO_CHARACTERS } from '@repo/db/schema';
import { stringFormat, z } from 'zod';

// Export the character limit constant for use in UI
export { MAX_MEMO_CHARACTERS };

export const createMemoSchema = insertMemoSchema;

export const updateMemoSchema = insertMemoSchema.extend({
  id: z.string().min(1, 'ID is required'),
});

// delete does not have schema from db
export const deleteMemoSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const listMemosSchema = z.object({
  date: z.string().optional(),
});
