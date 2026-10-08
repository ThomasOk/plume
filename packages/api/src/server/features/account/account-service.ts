import { verifyPassword } from '@repo/auth/credential';
import { alias, and, asc, count, eq, FORMER_USER_ID, inArray, isNotNull, ne, or, sql } from '@repo/db';
import { account, attachment, memo, space, spaceMember, user } from '@repo/db/schema';
import type { deleteAccountSchema } from './account-schemas';
import type { AppLogger } from '../../trpc';
import type { DatabaseInstance } from '@repo/db/client';
import type { z } from 'zod';
import {
  ConfirmationEmailMismatchError,
  IncorrectPasswordError,
  LastAdminOfSpacesError,
  ReauthenticationRequiredError,
} from '../../shared/errors';
import { removeDeletedObjects, type StorageService } from '../../shared/storage';
import { keepsAnAdmin } from '../spaces/space-policy';

type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// How recent a sign-in proves, for an account without a password, that its owner is the one
// deleting it.
const RECENT_SIGN_IN_MS = 10 * 60 * 1000;

// Who is asking: the user, and when the session they ask from was signed in.
interface Requester {
  userId: string;
  signedInAt: Date;
}

// Checked before anything is written. The email is read from the database, not from the
// session, which may be a cached copy (see the auth configuration's cookie cache).
async function assertConfirmed(db: DatabaseInstance, { userId, signedInAt }: Requester, input: DeleteAccountInput) {
  const [row] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId));
  if (!row || row.email.toLowerCase() !== input.email.toLowerCase()) {
    throw new ConfirmationEmailMismatchError();
  }

  // Verified against the hash with Better Auth's own function, so the hashing scheme stays the
  // library's.
  const [credential] = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
  if (credential?.password) {
    const verified =
      input.password !== undefined &&
      (await verifyPassword({ hash: credential.password, password: input.password }));
    if (!verified) throw new IncorrectPasswordError();
    return;
  }

  // Checked here rather than by Better Auth's `freshAge`, which the installed version gets
  // wrong by a factor of a thousand (ADR 0003).
  if (Date.now() - signedInAt.getTime() >= RECENT_SIGN_IN_MS) {
    throw new ReauthenticationRequiredError();
  }
}

export async function deleteAccount(
  db: DatabaseInstance,
  storage: StorageService,
  logger: AppLogger,
  { userId, signedInAt }: Requester,
  input: DeleteAccountInput,
) {
  await assertConfirmed(db, { userId, signedInAt }, input);

  const storageKeys = await db.transaction(async (tx) => {
    // The user's spaces are locked the way a membership change locks its space, so a change
    // to one of them — someone promoted, someone leaving — runs before this or after it, never
    // between the count below and the deletion. In a fixed order, so two deletions sharing
    // spaces cannot deadlock.
    const memberships = tx
      .select({ spaceId: spaceMember.spaceId })
      .from(spaceMember)
      .where(eq(spaceMember.userId, userId));
    await tx.select({ id: space.id }).from(space).where(inArray(space.id, memberships)).orderBy(asc(space.id)).for('update');

    // Read under the lock, the user's own role included: one taken before it could be stale.
    const spaces = await tx
      .select({
        id: space.id,
        name: space.title,
        memberCount: count(),
        adminCount: count(sql`case when ${spaceMember.role} = 'admin' then 1 end`),
        isAdmin: sql<boolean>`bool_or(${spaceMember.userId} = ${userId} and ${spaceMember.role} = 'admin')`,
      })
      .from(space)
      .innerJoin(spaceMember, eq(spaceMember.spaceId, space.id))
      .where(inArray(space.id, memberships))
      .groupBy(space.id)
      .orderBy(asc(space.title));

    const governedOnlyByUser = spaces.filter(
      ({ memberCount, adminCount, isAdmin }) =>
        memberCount > 1 && !keepsAnAdmin({ targetRole: isAdmin ? 'admin' : 'member', adminCount }),
    );
    if (governedOnlyByUser.length > 0) {
      throw new LastAdminOfSpacesError(governedOnlyByUser.map(({ id, name }) => ({ id, name })));
    }

    // A space with nobody else in it goes with its last member, its memos with it — comments
    // included, since a comment carries its memo's space. Their attachments' keys are
    // collected first, the cascade removing only the records.
    const aloneIn = spaces.filter(({ memberCount }) => memberCount === 1).map(({ id }) => id);
    const fromDeletedSpaces = await tx
      .delete(attachment)
      .where(inArray(attachment.memoId, tx.select({ id: memo.id }).from(memo).where(inArray(memo.spaceId, aloneIn))))
      .returning({ storageKey: attachment.storageKey });
    await tx.delete(space).where(inArray(space.id, aloneIn));

    // What outlives the account: the user's memos in a space, which the space owns, and their
    // comments under someone else's memo, which belong under that memo (ADR 0003). A comment
    // carries its memo's space, so a comment on their own space memo is caught by the first.
    const parent = alias(memo, 'parent');
    const outliving = tx
      .select({ id: memo.id })
      .from(memo)
      .leftJoin(parent, eq(memo.parentId, parent.id))
      .where(and(eq(memo.userId, userId), or(isNotNull(memo.spaceId), ne(parent.userId, userId))));

    const reassigned = await tx
      .update(memo)
      .set({ userId: FORMER_USER_ID })
      .where(inArray(memo.id, outliving))
      .returning({ id: memo.id });

    // An attachment cascades with its uploader, so those of a memo that stays would vanish
    // from it with the account; they pass with their memo.
    await tx
      .update(attachment)
      .set({ userId: FORMER_USER_ID })
      .where(inArray(attachment.memoId, reassigned.map(({ id }) => id)));

    // Everything else of the user's cascades with them: their personal memos, every comment
    // under those, whoever wrote it, and the uploads still pending. The cascade would remove
    // the attachment records, not the objects in storage, so they are deleted here first,
    // returning their keys.
    const remaining = tx.select({ id: memo.id }).from(memo).where(eq(memo.userId, userId));
    const removed = await tx
      .delete(attachment)
      .where(
        or(
          eq(attachment.userId, userId),
          inArray(attachment.memoId, remaining),
          inArray(attachment.memoId, tx.select({ id: memo.id }).from(memo).where(inArray(memo.parentId, remaining))),
        ),
      )
      .returning({ storageKey: attachment.storageKey });

    await tx.delete(user).where(eq(user.id, userId));
    return [...fromDeletedSpaces, ...removed].map(({ storageKey }) => storageKey);
  });

  await removeDeletedObjects(storage, logger, storageKeys, {
    userId,
    message: 'Failed to remove a deleted account\'s attachment from storage',
  });

  return { success: true };
}
