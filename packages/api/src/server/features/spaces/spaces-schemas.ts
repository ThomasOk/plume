import { z } from 'zod';

export const MAX_SPACE_TITLE_CHARACTERS = 80;

// A title and nothing else: no description, no icon, no vanity slug.
export const createSpaceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(MAX_SPACE_TITLE_CHARACTERS, `Title must be at most ${MAX_SPACE_TITLE_CHARACTERS} characters`),
});

// The input every space procedure starts from. The procedure's own input, if any, is
// merged into it.
export const spaceInputSchema = z.object({
  spaceId: z.string().min(1, 'Space ID is required'),
});
