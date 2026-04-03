import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useMarkAllArchived = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.notifications.markAllAsArchived.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.notifications.list.queryFilter());
    },
  });
};
