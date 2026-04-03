import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useNotifications = () => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.notifications.list.queryOptions(),
    refetchInterval: 1000 * 30, // Poll every 30 seconds
  });
};
