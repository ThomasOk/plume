import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsQueryKey } from './use-sessions';
import { authClient } from '@/lib/authClient';

export const useRevokeOtherSessions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.revokeOtherSessions();
      if (error)
        throw new Error(
          error.message ?? 'Failed to sign out the other sessions',
        );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey }),
  });
};
