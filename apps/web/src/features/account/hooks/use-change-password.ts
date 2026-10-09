import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsQueryKey } from './use-sessions';
import { authClient } from '@/lib/authClient';

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions: boolean;
}

export const useChangePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      const { error } = await authClient.changePassword(input);
      // Better Auth's message is already the one to show, "Invalid password" for a wrong
      // current password.
      if (error)
        throw new Error(error.message ?? 'Failed to change your password');
    },
    // Signing out the other devices replaces this device's session too: refresh both the
    // list beside the form and the current session it is matched against, which Better
    // Auth's client does not refetch after a password change on its own.
    onSuccess: () => {
      authClient.$store.notify('$sessionSignal');
      return queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
    },
  });
};
