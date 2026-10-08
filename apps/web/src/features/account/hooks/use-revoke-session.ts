import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsQueryKey } from './use-sessions';
import { authClient } from '@/lib/authClient';

export const useRevokeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const { error } = await authClient.revokeSession({ token });
      if (error)
        throw new Error(error.message ?? 'Failed to sign out the session');
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey }),
  });
};
