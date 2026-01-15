/**
 * Shared Zod schemas for API validation
 *
 * These schemas are used by both:
 * - Server-side tRPC procedures (input validation)
 * - Client-side forms (react-hook-form validation)
 *
 * Organization: Schemas are defined in their respective feature folders
 * (e.g., server/features/memos/schemas.ts) and re-exported here for
 * clean imports.
 */

// Memos feature schemas
export {
  createMemoSchema,
  updateMemoSchema,
  deleteMemoSchema,
} from '../server/features/memos/schemas';

// As you add more features, export their schemas here:
// export { createPostSchema, updatePostSchema } from '../server/features/posts/schemas';
// export { createUserSchema, updateUserSchema } from '../server/features/users/schemas';
