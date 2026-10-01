import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Audience } from '../components/audience-selector';
import { useTRPC, useTRPCClient } from '@/lib/api';

interface MoveMemoVariables {
  id: string;
  /** Where the memo goes: one of the user's spaces, or personal with the audience chosen. */
  to: Audience;
}

/**
 * Moving a memo between scopes. Into a space goes through that space's procedure, which
 * checks the membership; out of one names the new visibility, which the server requires.
 *
 * Two procedures behind one mutation, so the client is called directly rather than
 * through a single procedure's `mutationOptions()` as the other hooks do.
 */
export const useMoveMemo = () => {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, to }: MoveMemoVariables) =>
      to.kind === 'space'
        ? client.memos.space.move.mutate({ spaceId: to.spaceId, id })
        : client.memos.move.mutate({ id, visibility: to.kind }),
    onSuccess: () => {
      // The memo leaves one scope's list, tags and activity and joins another's.
      queryClient.invalidateQueries({ queryKey: trpc.memos.pathKey() });
    },
  });
};
