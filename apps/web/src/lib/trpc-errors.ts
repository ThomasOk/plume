import { TRPCClientError } from '@trpc/client';

export const isNotFound = (error: unknown): boolean =>
  error instanceof TRPCClientError && error.data?.code === 'NOT_FOUND';

// A NOT_FOUND is an answer, not a failure: retrying cannot change it, and each retry keeps
// the view loading for longer. Other errors keep React Query's default of three attempts.
export const retryUnlessNotFound = (failureCount: number, error: unknown): boolean =>
  !isNotFound(error) && failureCount < 3;
