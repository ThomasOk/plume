import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const useDeleteNotification = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.notifications.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.notifications.list.queryFilter());
    },
  });
};
