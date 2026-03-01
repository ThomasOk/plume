import { z } from 'zod';

/**
 * Search params validation schema for memos routes (Home & Explore)
 * Format: ?date=2026-02-08
 */
export const memosSearchSchema = z.object({
  date: z.string().optional(),
  tag: z.string().optional(),
  query: z.string().optional(),
});
