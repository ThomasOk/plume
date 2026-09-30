import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';
import { retryUnlessNotFound } from '@/lib/trpc-errors';

interface UseSpaceMemosOptions {
  spaceId: string;
  date?: string;
  tag?: string;
  query?: string;
}

export const useSpaceMemos = ({ spaceId, date, tag, query }: UseSpaceMemosOptions) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.memos.space.list.queryOptions({ spaceId, date, tag, query }),
    retry: retryUnlessNotFound,
  });
};
