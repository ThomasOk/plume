import { z } from 'zod';

export const MAX_ACCOUNT_NAME_CHARACTERS = 100;

// The rule on a user's name. The auth configuration enforces it on every update — Better
// Auth checks nothing on a name — and the settings form validates with it for immediate
// feedback, so the two cannot disagree.
export const accountNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(
    MAX_ACCOUNT_NAME_CHARACTERS,
    `Name must be at most ${MAX_ACCOUNT_NAME_CHARACTERS} characters`,
  );
