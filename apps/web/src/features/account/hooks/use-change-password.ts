import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/lib/authClient';

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions: boolean;
}

export const useChangePassword = () =>
  useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      const { error } = await authClient.changePassword(input);
      // Better Auth's message is already the one to show, "Invalid password" for a wrong
      // current password.
      if (error)
        throw new Error(error.message ?? 'Failed to change your password');
    },
  });
