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
  MAX_MEMO_CHARACTERS,
} from '../server/features/memos/memos-schemas';

// Spaces feature schemas
export {
  createSpaceSchema,
  renameSpaceSchema,
  MAX_SPACE_TITLE_CHARACTERS,
} from '../server/features/spaces/spaces-schemas';

// The space role matrix, so the interface offers exactly what the server allows.
export {
  keepsAnAdmin,
  may,
  mayDeleteMemo,
  mayEditMemo,
  type SpaceAction,
} from '../server/features/spaces/space-policy';

// Invitations feature schemas
export { createInvitationSchema } from '../server/features/invitations/invitations-schemas';

// As you add more features, export their schemas here:
// export { createUserSchema, updateUserSchema } from '../server/features/users/schemas';
