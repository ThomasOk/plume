import { insertMemoSchema } from '@repo/db/schema';
import { z } from 'zod';

export const createMemoSchema = insertMemoSchema;

export const updateMemoSchema = insertMemoSchema.extend({
  id: z.string().min(1, 'ID is required'),
});

// delete does not have schema from db
export const deleteMemoSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});
