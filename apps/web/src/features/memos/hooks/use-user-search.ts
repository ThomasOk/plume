import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useUserSearch = (query: string) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.users.search.queryOptions({ query }),
    enabled: query.length >= 1,
    staleTime: 30_000,
  });
};
