import { alias, and, eq, isNull, or, sql } from '@repo/db';
import { memo, spaceMember } from '@repo/db/schema';
import type { SpaceMembership } from '../spaces';
import type { SQL } from '@repo/db';

/**
 * Whose memos a read is about. Every memo read takes one, so a query that does not say
 * which memos it reads does not compile (ADR 0004).
 */
export type MemoScope =
  | { kind: 'personal'; userId: string }
  | { kind: 'space'; spaceId: string };

export const personalScope = (userId: string): MemoScope => ({ kind: 'personal', userId });

/**
 * A space scope is built from a membership, never from a bare identifier: the only way to
 * hold one is to have gone through `spaceProcedure`, which resolved it.
 */
export const spaceScope = (membership: SpaceMembership): MemoScope => ({
  kind: 'space',
  spaceId: membership.spaceId,
});

/**
 * The one place a scope becomes SQL. No call site composes this by hand — the second
 * hand-written copy is where a space leaks into a personal view, or the reverse.
 */
export const memoScopeCondition = (scope: MemoScope): SQL => {
  switch (scope.kind) {
    // Author *and* no space: filtering on the author alone would pull the user's space
    // memos into their personal views.
    case 'personal':
      return and(eq(memo.userId, scope.userId), isNull(memo.spaceId))!;
    // No author condition — that a member reads what another member wrote is what
    // sharing means.
    case 'space':
      return eq(memo.spaceId, scope.spaceId);
  }
};

/**
 * Whether one identified memo may be read by a given reader: it is public, it is one of
 * the reader's personal memos, or it is in a space the reader is a member of. `null` is
 * an anonymous visitor, who sees only what is public.
 *
 * This takes a reader rather than a scope because a read by identifier does not know its
 * scope beforehand: a link to a memo carries the memo, not the space it sits in. The
 * membership that `spaceProcedure` resolves for a scoped read is resolved here inside the
 * query, so it still answers a non-member exactly as it answers a missing memo.
 *
 * A comment carries its memo's visibility and space (ADR 0001), but not its author: a
 * private comment is the private conversation of its memo's author, so the personal term
 * asks who wrote the memo, not the comment. Otherwise a comment's author would keep a memo
 * that turned private, through the one comment they wrote under it.
 *
 * Guards that test `visibility === 'private'` instead let everything non-private through,
 * which a space memo now is.
 */
export const readableMemoCondition = (readerId: string | null): SQL => {
  const isPublic = eq(memo.visibility, 'public');
  if (!readerId) return isPublic;

  // Named in the FROM by hand: an alias interpolated into raw SQL renders without its table.
  const parent = alias(memo, 'parent');
  const threadAuthorId = sql`COALESCE((SELECT ${parent.userId} FROM ${memo} AS ${sql.identifier('parent')} WHERE ${parent.id} = ${memo.parentId}), ${memo.userId})`;
  const isReadersPersonal = and(sql`${threadAuthorId} = ${readerId}`, isNull(memo.spaceId))!;
  const inReadersSpaces = sql`${memo.spaceId} IN (SELECT ${spaceMember.spaceId} FROM ${spaceMember} WHERE ${spaceMember.userId} = ${readerId})`;
  return or(isPublic, isReadersPersonal, inReadersSpaces)!;
};
