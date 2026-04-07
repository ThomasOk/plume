import { z } from 'zod';

export const searchUsersSchema = z.object({
  query: z.string().min(1).max(50),
});
