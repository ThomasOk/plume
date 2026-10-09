import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

/** As many comments as the strip under a card shows: where the conversation stands now. */
export const LATEST_COMMENTS_SHOWN = 3;

// Its own query, apart from the comment section's: the strip needs three comments, not the
// whole conversation. Invalidating a memo's comments still reaches it, since its key only
// adds a limit to theirs.
export const useLatestComments = (memoId: string, { enabled }: { enabled: boolean }) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.memos.listComments.queryOptions({ memoId, limit: LATEST_COMMENTS_SHOWN }),
    enabled,
  });
};
