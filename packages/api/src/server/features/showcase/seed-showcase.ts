import { and, eq, inArray, isNull } from '@repo/db';
import { memo, user } from '@repo/db/schema';
import type { ReactionEmoji } from '../memos/memos-schemas';
import type { DatabaseInstance } from '@repo/db/client';
import { createMemo, featureMemo, unfeatureMemo, updateMemo } from '../memos/memos-service';
import { reactToMemo } from '../memos/reactions-service';

/**
 * The showcase: a few public memos an operator writes and features on Explore, so that a
 * visitor glancing at Plume understands it — with comments and reactions from other
 * accounts, since a memo nobody answered shows neither.
 *
 * Every write goes through the memo services, never a raw insert: tags are extracted, a
 * comment records its outbox event, and the featured constraint holds, as for any other memo.
 *
 * Re-runnable: a memo is recognised by its first line among its author's public memos, and a
 * comment by its first line among its author's comments on that memo. A rerun updates a text
 * that changed instead of writing it twice.
 */

export interface ShowcaseReaction {
  userId: string;
  emoji: ReactionEmoji;
}

export interface ShowcaseComment {
  authorId: string;
  content: string;
  reactions?: ShowcaseReaction[];
}

export interface ShowcaseMemo {
  content: string;
  comments?: ShowcaseComment[];
  reactions?: ShowcaseReaction[];
}

export interface Showcase {
  // An operator: featuring is theirs alone (ADR 0007).
  authorId: string;
  // In the order Explore shows them, first on top.
  memos: ShowcaseMemo[];
}

export type ShowcaseOutcome = 'created' | 'updated' | 'unchanged';

export interface SeededMemo {
  id: string;
  title: string;
  outcome: ShowcaseOutcome;
}

export class ShowcaseRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShowcaseRefusedError';
  }
}

const firstLine = (content: string) => content.trimStart().split('\n', 1)[0]!.trim();

// Featuring stamps the current time, and Explore orders by it: two featurings in the same
// millisecond would tie, and the tie would fall back to creation dates.
const nextMillisecond = () => new Promise((resolve) => setTimeout(resolve, 5));

const everyone = (showcase: Showcase) => {
  const ids = new Set([showcase.authorId]);
  for (const m of showcase.memos) {
    for (const r of m.reactions ?? []) ids.add(r.userId);
    for (const c of m.comments ?? []) {
      ids.add(c.authorId);
      for (const r of c.reactions ?? []) ids.add(r.userId);
    }
  }
  return [...ids];
};

// Everything that can refuse is asked before the first write, so a typo in an identifier
// never leaves half a showcase behind.
async function assertRunnable(db: DatabaseInstance, showcase: Showcase) {
  const ids = everyone(showcase);
  const found = await db.select({ id: user.id, isOperator: user.isOperator }).from(user).where(inArray(user.id, ids));

  const unknown = ids.filter((id) => !found.some((u) => u.id === id));
  if (unknown.length > 0) throw new ShowcaseRefusedError(`No user has the identifier ${unknown.map((id) => `"${id}"`).join(', ')}`);

  const author = found.find((u) => u.id === showcase.authorId)!;
  if (!author.isOperator) throw new ShowcaseRefusedError(`The author "${showcase.authorId}" is not an operator`);

  const titles = showcase.memos.map((m) => firstLine(m.content));
  const repeated = titles.find((title, i) => titles.indexOf(title) !== i);
  if (repeated !== undefined) throw new ShowcaseRefusedError(`Two memos start with "${repeated}"`);
}

// Writes `content` where `existing` holds the same first line, or anew. `write` creates it.
async function upsert(
  db: DatabaseInstance,
  authorId: string,
  existing: { id: string; content: string } | undefined,
  content: string,
  write: () => Promise<{ id: string }>,
): Promise<{ id: string; outcome: ShowcaseOutcome }> {
  if (!existing) return { id: (await write()).id, outcome: 'created' };
  if (existing.content === content) return { id: existing.id, outcome: 'unchanged' };
  await updateMemo(db, authorId, { id: existing.id, content, visibility: 'public' });
  return { id: existing.id, outcome: 'updated' };
}

async function react(db: DatabaseInstance, memoId: string, reactions: ShowcaseReaction[] = []) {
  for (const { userId, emoji } of reactions) await reactToMemo(db, userId, { memoId, emoji });
}

export async function seedShowcase(db: DatabaseInstance, showcase: Showcase): Promise<SeededMemo[]> {
  await assertRunnable(db, showcase);
  const { authorId } = showcase;

  const published = await db
    .select({ id: memo.id, content: memo.content })
    .from(memo)
    .where(and(eq(memo.userId, authorId), isNull(memo.parentId), eq(memo.visibility, 'public')));

  const seeded: SeededMemo[] = [];
  for (const entry of showcase.memos) {
    const title = firstLine(entry.content);
    const { id, outcome } = await upsert(
      db,
      authorId,
      published.find((m) => firstLine(m.content) === title),
      entry.content,
      () => createMemo(db, authorId, { kind: 'personal' }, { content: entry.content, visibility: 'public' }),
    );

    const comments = await db.select({ id: memo.id, userId: memo.userId, content: memo.content }).from(memo).where(eq(memo.parentId, id));
    for (const comment of entry.comments ?? []) {
      const { id: commentId } = await upsert(
        db,
        comment.authorId,
        comments.find((c) => c.userId === comment.authorId && firstLine(c.content) === firstLine(comment.content)),
        comment.content,
        () => createMemo(db, comment.authorId, { kind: 'personal' }, { content: comment.content, parentId: id }),
      );
      await react(db, commentId, comment.reactions);
    }

    await react(db, id, entry.reactions);
    seeded.push({ id, title, outcome });
  }

  // Featured anew on every run, last first, so Explore shows them in the declared order even
  // after one was added or moved: featuring a featured memo would keep its old date.
  const actor = { id: authorId, isOperator: true };
  for (const { id } of seeded) await unfeatureMemo(db, actor, { id });
  for (const { id } of [...seeded].reverse()) {
    await featureMemo(db, actor, { id });
    await nextMillisecond();
  }

  return seeded;
}
