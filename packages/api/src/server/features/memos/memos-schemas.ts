import { insertMemoSchema, MAX_MEMO_CHARACTERS } from '@repo/db/schema';
import { stringFormat, z } from 'zod';

// Export the character limit constant for use in UI
export { MAX_MEMO_CHARACTERS };

export const createMemoSchema = insertMemoSchema.extend({
  parentId: z.string().optional(),
});

// Writing into a space: its audience is the space, so the only visibility accepted is
// `space`. Naming another is refused rather than overridden — a memo in a space cannot be
// private or public (ADR 0003). A comment is not written here: it takes its parent's place.
export const createSpaceMemoSchema = insertMemoSchema.pick({ content: true }).extend({
  visibility: z.literal('space').default('space'),
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
