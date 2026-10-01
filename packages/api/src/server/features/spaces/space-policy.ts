import type { SpaceRole } from '@repo/db/schema';

// The role matrix, as pure functions over plain values. No database access: a policy that
// needs `db` is the signal that a fact was not resolved upstream (ADR 0004).
//
// Imported by the web client too, through `@repo/api/schemas`, so that the interface offers
// exactly what the server allows. Keep it free of anything that cannot run in a browser.

export type SpaceAction =
  | 'readMemos'
  | 'writeMemo'
  | 'editOwnMemo'
  | 'deleteOwnMemo'
  | 'editOthersMemo'
  | 'deleteOthersMemo'
  // Invite, remove, or change a role.
  | 'manageMembership'
  // Rename or delete the space.
  | 'manageSpace';

// Read this table against the spec. Reading is not asked here: a space's memos are read by
// its members, which is what membership means, and `spaceProcedure` enforces it (ADR 0004).
// The row is kept so the table reads like the spec's. Leaving is not a cell: every member may leave, and the
// only limit — the last admin — is about what remains, not about a role (`keepsAnAdmin`).
const SPACE_MATRIX: Record<SpaceAction, Record<SpaceRole, boolean>> = {
  readMemos: { admin: true, member: true },
  writeMemo: { admin: true, member: true },
  editOwnMemo: { admin: true, member: true },
  deleteOwnMemo: { admin: true, member: true },
  // Nobody edits another member's memo: it would keep its author's byline over words they
  // did not write, and the model has no way to record that. Deleting it is moderation.
  editOthersMemo: { admin: false, member: false },
  deleteOthersMemo: { admin: true, member: false },
  manageMembership: { admin: true, member: false },
  manageSpace: { admin: true, member: false },
};

export function may(role: SpaceRole, action: SpaceAction): boolean {
  return SPACE_MATRIX[action][role];
}

/**
 * The facts about a user and one memo. `role` is the user's role in the memo's space, or
 * `null` when the memo is personal or the user is not a member of its space — then only
 * its author may act on it.
 */
export interface MemoActor {
  isAuthor: boolean;
  role: SpaceRole | null;
}

export function mayEditMemo({ isAuthor, role }: MemoActor): boolean {
  if (role === null) return isAuthor;
  return may(role, isAuthor ? 'editOwnMemo' : 'editOthersMemo');
}

export function mayDeleteMemo({ isAuthor, role }: MemoActor): boolean {
  if (role === null) return isAuthor;
  return may(role, isAuthor ? 'deleteOwnMemo' : 'deleteOthersMemo');
}

/**
 * Whether a space still has an admin after a member leaves, is removed, or is demoted. The
 * invariant is "the space always has an admin", not "leaving is checked": every path that
 * takes an admin away asks this.
 */
export function keepsAnAdmin({
  targetRole,
  adminCount,
}: {
  targetRole: SpaceRole;
  adminCount: number;
}): boolean {
  return targetRole !== 'admin' || adminCount > 1;
}
