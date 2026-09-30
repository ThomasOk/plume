import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

interface UseSpacesOptions {
  enabled?: boolean;
}

export const useSpaces = (options?: UseSpacesOptions) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.spaces.list.queryOptions(),
    enabled: options?.enabled,
  });
};
