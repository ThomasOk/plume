import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  commentEmails: z.boolean(),
});
