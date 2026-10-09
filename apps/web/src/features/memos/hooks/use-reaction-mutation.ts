import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Reaction } from '@/lib/types';
import type { ReactionEmoji } from '@repo/api/schemas';
import { withReaction } from '../reaction-summary';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useTRPC } from '@/lib/api';

type WithReactions = { id: string; reactions: Reaction[] };

const holdsReactions = (value: unknown): value is WithReactions =>
  typeof value === 'object' && value !== null && 'id' in value && Array.isArray((value as WithReactions).reactions);

// A cached read as it stands once the memo's reactions are rewritten: a list holding the
// memo, or the memo itself on its page. Anything else under `memos` — stats, tags, a list
// without it — comes back as it was, so the caller can tell which reads it touched.
const rewriteMemoIn = (data: unknown, memoId: string, rewrite: (summary: Reaction[]) => Reaction[]): unknown => {
  if (Array.isArray(data)) {
    let touched = false;
    const next = data.map((item) => {
      if (!holdsReactions(item) || item.id !== memoId) return item;
      touched = true;
      return { ...item, reactions: rewrite(item.reactions) };
    });
    return touched ? next : data;
  }
  if (holdsReactions(data) && data.id === memoId) return { ...data, reactions: rewrite(data.reactions) };
  return data;
};

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
      const memosKey = trpc.memos.pathKey();
      // A refetch already in flight would land on top of the rewrite with the state before it.
      await queryClient.cancelQueries({ queryKey: memosKey });

      const touched: [QueryKey, unknown][] = [];
      if (!user) return { touched };
      const me = { id: user.id, name: user.name };
      for (const [queryKey, data] of queryClient.getQueriesData({ queryKey: memosKey })) {
        const next = rewriteMemoIn(data, variables.memoId, (summary) => withReaction(summary, me, emojiOf(variables)));
        if (next === data) continue;
        touched.push([queryKey, data]);
        queryClient.setQueryData(queryKey, next);
      }
      return { touched };
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, data] of context?.touched ?? []) queryClient.setQueryData(queryKey, data);
      toast.error('Your reaction could not be saved');
    },
    onSettled: (_data, _error, _variables, context) => {
      for (const [queryKey] of context?.touched ?? []) queryClient.invalidateQueries({ queryKey, exact: true });
    },
  });
};
