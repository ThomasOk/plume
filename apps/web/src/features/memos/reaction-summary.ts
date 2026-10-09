import { REACTION_EMOJIS, type ReactionEmoji } from '@repo/api/schemas';
import type { ReactionSummary } from '@/lib/types';

type Reactor = ReactionSummary['reactors'][number];

/**
 * A memo's reactions as they stand once the reader's own changes to `emoji` — or to none —
 * so a reaction shows before the server confirms it. Their old emoji loses them, their new
 * one gains them, an emoji nobody chooses any more leaves, and the order stays the set's,
 * as the server gives it.
 */
export const withReaction = (summary: ReactionSummary[], me: Reactor, emoji: ReactionEmoji | null): ReactionSummary[] => {
  const withoutMe = summary
    .map((entry) =>
      entry.reactedByMe
        ? {
            ...entry,
            count: entry.count - 1,
            reactedByMe: false,
            reactors: entry.reactors.filter(({ id }) => id !== me.id),
          }
        : entry,
    )
    .filter(({ count }) => count > 0);

  if (emoji === null) return withoutMe;

  const existing = withoutMe.find((entry) => entry.emoji === emoji);
  const chosen: ReactionSummary = existing
    ? { ...existing, count: existing.count + 1, reactedByMe: true, reactors: [...existing.reactors, me] }
    : { emoji, count: 1, reactedByMe: true, reactors: [me] };

  return [...withoutMe.filter((entry) => entry.emoji !== emoji), chosen].sort(
    (a, b) => REACTION_EMOJIS.indexOf(a.emoji) - REACTION_EMOJIS.indexOf(b.emoji),
  );
};
