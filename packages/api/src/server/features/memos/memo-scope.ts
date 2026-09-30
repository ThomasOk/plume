import { and, eq, isNull, or } from '@repo/db';
import { memo } from '@repo/db/schema';
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
 * Whether one identified memo may be read: it is public, or it falls inside the reader's
 * scope. `null` is a reader with no scope at all — an anonymous visitor, who sees only
 * what is public.
 *
 * Guards that test `visibility === 'private'` instead let everything non-private through,
 * which a space memo now is.
 */
export const readableMemoCondition = (scope: MemoScope | null): SQL => {
  const isPublic = eq(memo.visibility, 'public');
  return scope ? or(isPublic, memoScopeCondition(scope))! : isPublic;
};
