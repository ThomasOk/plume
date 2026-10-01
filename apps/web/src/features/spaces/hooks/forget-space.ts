import type { useTRPC } from '@/lib/api';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Drops what the client holds of a space the user no longer reads — left or deleted — rather
 * than refetching it into a refusal. Memo reads by identifier go too: a memo of the space
 * opened earlier must not stay on screen.
 */
export const forgetSpace = (
  queryClient: QueryClient,
  trpc: ReturnType<typeof useTRPC>,
  spaceId: string,
) => {
  queryClient.removeQueries({ queryKey: trpc.spaces.get.queryKey({ spaceId }) });
  queryClient.removeQueries({ queryKey: trpc.memos.space.pathKey() });
  queryClient.removeQueries({ queryKey: trpc.memos.getById.pathKey() });
  queryClient.removeQueries({ queryKey: trpc.memos.listComments.pathKey() });
  queryClient.invalidateQueries({ queryKey: trpc.spaces.list.queryKey() });
};
