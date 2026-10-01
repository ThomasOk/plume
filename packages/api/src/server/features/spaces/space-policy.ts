import type { SpaceRole } from '@repo/db/schema';

// The role matrix, as pure functions over plain values. No database access: a policy that
// needs `db` is the signal that a fact was not resolved upstream (ADR 0004).

// Invite, remove, or change a role.
export function mayManageMembership(role: SpaceRole): boolean {
  return role === 'admin';
}
