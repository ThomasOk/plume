/**
 * Client tRPC avec TanStack React Query
 * Permet d'utiliser les hooks useQuery et useMutation dans les composants
 */
import { createTRPCContext } from '@trpc/tanstack-react-query';
import type { AppRouter } from '@repo/api/server';

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

// Alias pour une utilisation plus intuitive
export { useTRPC as useApi };
