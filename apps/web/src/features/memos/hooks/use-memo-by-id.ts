import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useMemoById = (id: string) => {
  const trpc = useTRPC();

  return useQuery(trpc.memos.getById.queryOptions({ id }));
};
