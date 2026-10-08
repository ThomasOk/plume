import { useQuery } from '@tanstack/react-query';
import { authClient } from '@/lib/authClient';

// The sign-in methods linked to the user: `credential` for a password, `google` for Google.
export const useLinkedAccounts = () =>
  useQuery({
    queryKey: ['auth', 'linked-accounts'],
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error)
        throw new Error(error.message ?? 'Failed to load your sign-in methods');
      return data;
    },
  });
