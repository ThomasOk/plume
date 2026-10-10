import { MutationCache, QueryClient } from '@tanstack/react-query';
import { sounds } from '@/lib/sounds';

export const queryClient = new QueryClient({
  // A failed action always shows itself (a toast, an inline message, a rolled-back
  // state); the sound makes sure it is not missed.
  mutationCache: new MutationCache({ onError: () => sounds.error() }),
});
