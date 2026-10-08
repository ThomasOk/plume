import { useQuery } from '@tanstack/react-query';
import { authClient } from '@/lib/authClient';

export const sessionsQueryKey = ['auth', 'sessions'];

// Every unexpired session of the user, the current one included.
export const useSessions = () =>
  useQuery({
    queryKey: sessionsQueryKey,
    queryFn: async () => {
      const { data, error } = await authClient.listSessions();
      if (error)
        throw new Error(error.message ?? 'Failed to load your sessions');
      return data;
    },
  });
