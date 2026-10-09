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

// Moving a memo into a space: the space is the procedure's, so only the memo is named.
export const moveSpaceMemoSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

// Moving a memo out of its space makes it personal, and a personal memo is private or
// public. The new audience is required, with no default: a memo never silently changes
// who can read it.
export const moveMemoSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  visibility: z.enum(['private', 'public']),
});

// Without a limit, the whole conversation; with one, only where it stands now: the `limit`
// most recent comments, as the strip under a card in the list shows them.
export const listCommentsSchema = z.object({
  memoId: z.string().min(1, 'Memo ID is required'),
  limit: z.number().int().positive().optional(),
});

export const updateMemoSchema = insertMemoSchema.extend({
  id: z.string().min(1, 'ID is required'),
});

// delete does not have schema from db
export const deleteMemoSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

// Pinning and unpinning name only the memo: whether the user may is decided from their role
// in the memo's scope, which the memo itself tells.
export const pinMemoSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

// Featuring and unfeaturing name only the memo: whether the user may is decided from their
// operator flag, which the session carries.
export const featureMemoSchema = z.object({
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
