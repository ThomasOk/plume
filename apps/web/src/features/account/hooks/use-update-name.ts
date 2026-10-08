import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/authClient';

// Through Better Auth rather than tRPC: `updateUser` refreshes the cached session cookie,
// so every view reading the session shows the new name at once. A tRPC update would leave
// the old name in that cache for up to five minutes.
export const useUpdateName = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await authClient.updateUser({ name });
      if (error) throw new Error(error.message ?? 'Failed to update your name');
    },
    // Memos, comments, space members and notifications carry the name as the server read
    // it, across many queries: refetch them all rather than chase each one.
    onSuccess: () => queryClient.invalidateQueries(),
  });
};
