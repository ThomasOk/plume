import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const usePreferences = () => {
  const trpc = useTRPC();
  return useQuery(trpc.preferences.get.queryOptions());
};
