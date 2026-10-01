import { skipToken, useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';
import { retryUnlessNotFound } from '@/lib/trpc-errors';

/** A space and the user's role in it. With no space id — outside a space — it fetches nothing. */
export const useSpace = (spaceId: string | undefined) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.spaces.get.queryOptions(spaceId ? { spaceId } : skipToken),
    // A missing space and one the user is not a member of answer alike, with NOT_FOUND.
    retry: retryUnlessNotFound,
  });
};
