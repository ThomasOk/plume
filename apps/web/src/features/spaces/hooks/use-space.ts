import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';
import { retryUnlessNotFound } from '@/lib/trpc-errors';

export const useSpace = (spaceId: string) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.spaces.get.queryOptions({ spaceId }),
    // A missing space and one the user is not a member of answer alike, with NOT_FOUND.
    retry: retryUnlessNotFound,
  });
};
