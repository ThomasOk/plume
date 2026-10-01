import { useMutation, useQueryClient } from '@tanstack/react-query';
import { forgetSpace } from './forget-space';
import { useTRPC } from '@/lib/api';

export const useLeaveSpace = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.spaces.leave.mutationOptions(),
    onSuccess: (_result, { spaceId }) => forgetSpace(queryClient, trpc, spaceId),
  });
};
