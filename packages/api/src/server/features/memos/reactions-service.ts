import { alias, and, eq, inArray, sql } from '@repo/db';
import { memo, reaction, user } from '@repo/db/schema';
import { nanoid } from 'nanoid';
import type { DatabaseInstance } from '@repo/db/client';
import type { z } from 'zod';
import { MemoNotFoundError } from '../../shared/errors';
import { readableMemoCondition } from './memo-scope';
import { REACTION_EMOJIS, type ReactionEmoji, type reactSchema, type unreactSchema } from './memos-schemas';

type ReactInput = z.infer<typeof reactSchema>;
type UnreactInput = z.infer<typeof unreactSchema>;

// Reacting is open to whoever may read the memo, its author included — for a comment, whoever
// may read its parent. The parent decides, not the comment: the comment's own author is in its
// personal scope even once the parent has turned private. A memo the reader cannot read answers
// like a missing one, as every other memo procedure does.
async function assertReadable(db: DatabaseInstance, readerId: string, memoId: string) {
  const target = alias(memo, 'target');
  const [found] = await db
    .select({ id: target.id })
    .from(target)
    .innerJoin(memo, eq(memo.id, sql`COALESCE(${target.parentId}, ${target.id})`))
    .where(and(eq(target.id, memoId), readableMemoCondition(readerId)))
    .limit(1);

  if (!found) throw new MemoNotFoundError();
}

// One reaction per reader per memo: choosing another replaces it. Choosing the same one again
// changes nothing, not even its date, so a replay lands where the first call did. Reacting
// records no event and notifies no one: it stays a light gesture.
export async function reactToMemo(db: DatabaseInstance, readerId: string, input: ReactInput) {
  await assertReadable(db, readerId, input.memoId);

  const now = new Date();
  await db
    .insert(reaction)
    .values({ id: nanoid(), memoId: input.memoId, userId: readerId, emoji: input.emoji, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [reaction.userId, reaction.memoId],
      set: { emoji: input.emoji, updatedAt: now },
      setWhere: sql`${reaction.emoji} <> ${input.emoji}`,
    });

  return { success: true };
}

// Takes back whatever the reader's reaction is; having none is not an error.
export async function unreactToMemo(db: DatabaseInstance, readerId: string, input: UnreactInput) {
  await assertReadable(db, readerId, input.memoId);

  await db.delete(reaction).where(and(eq(reaction.memoId, input.memoId), eq(reaction.userId, readerId)));

  return { success: true };
}

/**
 * The reactions of a page of memos, in one grouped query over their ids, never one per memo.
 * The memos are already admitted by the read that lists them, so this takes no scope. Each
 * memo's summary follows the order of the set and leaves out the emojis nobody chose; the
 * reactors come in the order they chose. `null` is an anonymous reader, who chose nothing.
 */
export async function fetchReactionsForMemos(db: DatabaseInstance, readerId: string | null, memoIds: string[]) {
  // Spelled out rather than named: the router's type is read from outside this package,
  // which cannot name a type of this module.
  const byMemoId = new Map<
    string,
    { emoji: ReactionEmoji; count: number; reactedByMe: boolean; reactors: { id: string; name: string }[] }[]
  >();
  if (memoIds.length === 0) return byMemoId;

  const rows = await db
    .select({
      memoId: reaction.memoId,
      emoji: reaction.emoji,
      count: sql<number>`COUNT(*)::int`,
      reactedByMe: readerId === null ? sql<boolean>`false` : sql<boolean>`BOOL_OR(${reaction.userId} = ${readerId})`,
      reactors: sql<{ id: string; name: string }[]>`JSON_AGG(JSON_BUILD_OBJECT('id', ${user.id}, 'name', ${user.name}) ORDER BY ${reaction.updatedAt})`,
    })
    .from(reaction)
    .innerJoin(user, eq(reaction.userId, user.id))
    .where(inArray(reaction.memoId, memoIds))
    .groupBy(reaction.memoId, reaction.emoji);

  const order = (emoji: string) => REACTION_EMOJIS.indexOf(emoji as ReactionEmoji);
  // An emoji since taken out of the set is no longer shown, rather than shown as one the
  // reader could not pick.
  const known = rows.filter((row) => order(row.emoji) !== -1).sort((a, b) => order(a.emoji) - order(b.emoji));

  for (const { memoId, emoji, ...summary } of known) {
    const list = byMemoId.get(memoId) ?? [];
    list.push({ emoji: emoji as ReactionEmoji, ...summary });
    byMemoId.set(memoId, list);
  }
  return byMemoId;
}
