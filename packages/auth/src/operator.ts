import { eq, user, type DatabaseInstance } from '@repo/db';

/**
 * The operator role is granted and revoked out of band, by a command run against the
 * database — never through the app (ADR 0007). These functions hold the behaviour; the
 * commands in `apps/server` are thin shells over them.
 *
 * The account is designated by its user identifier, never its email: sign-up does not
 * verify email addresses, so an email proves nothing about who holds the account.
 *
 * A session reads the role from its cookie cache for up to five minutes, so a change takes
 * that long to reach the app; an urgent revocation means revoking the account's sessions.
 */

export class UnknownUserError extends Error {
  constructor(userId: string) {
    super(`No user has the identifier "${userId}"`);
    this.name = 'UnknownUserError';
  }
}

export interface ChangedUser {
  name: string;
  email: string;
}

// Names the state it wants rather than toggling it, so running a command twice changes
// nothing. `updatedAt` is left alone: the role is not an edit of the account.
const setOperator = async (
  db: DatabaseInstance,
  userId: string,
  isOperator: boolean,
): Promise<ChangedUser> => {
  const [account] = await db
    .update(user)
    .set({ isOperator })
    .where(eq(user.id, userId))
    .returning({ name: user.name, email: user.email });
  if (!account) throw new UnknownUserError(userId);
  return account;
};

export const grantOperator = (db: DatabaseInstance, userId: string) =>
  setOperator(db, userId, true);

export const revokeOperator = (db: DatabaseInstance, userId: string) =>
  setOperator(db, userId, false);
