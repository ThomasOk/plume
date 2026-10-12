import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ReactionSummary } from '@/lib/types';
import type { ReactionEmoji } from '@repo/api/schemas';
import { restoreCachedReads, rewriteCachedMemo, type CachedMemo, type TouchedReads } from '../cached-memo';
import { withReaction } from '../reaction-summary';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useTRPC } from '@/lib/api';

type WithReactions = CachedMemo & { reactions: ReactionSummary[] };

const holdsReactions = (memo: CachedMemo): memo is WithReactions => Array.isArray((memo as WithReactions).reactions);

/**
 * Reacting and unreacting, shown at once: every cached read holding the memo is rewritten
 * before the server answers, put back with a toast if it refuses, and refetched once it has
 * answered either way. `emojiOf` tells the reader's reaction once the call lands — an emoji,
 * or none.
 */
export const useReactionMutation = <Variables extends { memoId: string }>(
  mutationFn: (variables: Variables) => Promise<unknown>,
  emojiOf: (variables: Variables) => ReactionEmoji | null,
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      if (!user) return { touched: [] as TouchedReads };
      const me = { id: user.id, name: user.name };
      const touched = await rewriteCachedMemo(queryClient, trpc.memos.pathKey(), variables.memoId, (memo) =>
        holdsReactions(memo) ? { ...memo, reactions: withReaction(memo.reactions, me, emojiOf(variables)) } : memo,
      );
      return { touched };
    },
    onError: (_error, _variables, context) => {
      restoreCachedReads(queryClient, context?.touched ?? []);
      toast.error('Your reaction could not be saved');
    },
    onSettled: (_data, _error, _variables, context) => {
      for (const [queryKey] of context?.touched ?? []) queryClient.invalidateQueries({ queryKey, exact: true });
    },
  });
};
