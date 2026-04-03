import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useArchiveNotification = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.notifications.markAsArchived.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.notifications.list.queryFilter());
    },
  });
};
