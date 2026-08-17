import { eq, memo, user } from '@repo/db';
import type { CommentCreatedPayload } from '../../events/domain-events';
import type { DatabaseInstance } from '@repo/db/client';

export interface CommentRecipient {
  id: string;
  email: string;
}

// Who a reaction to `comment.created` is for: the parent memo's author. Both reactions —
// the notification and the email — derive the same recipient and apply the same policy, so
// it lives here once. Keeping it in one place is a correctness guarantee, not just tidiness:
// two divergent copies could let one channel fire (email) while the other stays silent
// (notification) for the same comment. Returning `null` is the single "don't react" signal.
//
// The receiver is derived here, deliberately not carried in the event payload — "who to
// notify" is policy the handler owns, not a fact the producer knows.
export async function resolveCommentRecipient(
  db: DatabaseInstance,
  { parentMemoId, authorId }: CommentCreatedPayload,
): Promise<CommentRecipient | null> {
  const [recipient] = await db
    .select({ id: memo.userId, email: user.email })
    .from(memo)
    .innerJoin(user, eq(memo.userId, user.id))
    .where(eq(memo.id, parentMemoId))
    .limit(1);

  // Parent memo (or its author) gone before the drain: nothing to react to.
  if (!recipient) return null;

  // Policy: never notify or email someone about a comment on their own memo.
  if (recipient.id === authorId) return null;

  return recipient;
}
