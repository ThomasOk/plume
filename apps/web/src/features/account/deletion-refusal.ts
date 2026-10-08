import { TRPCClientError } from '@trpc/client';

interface SpaceRef {
  id: string;
  name: string;
}

// How the server refuses an account deletion: CONFLICT when the user is the last admin of
// spaces with other members, which it names; PRECONDITION_FAILED when an account without a
// password was signed in too long ago. Anything else explains itself in its message (a wrong
// password, an email that does not match).
export type DeletionRefusal =
  | { kind: 'last-admin'; spaces: SpaceRef[] }
  | { kind: 'reauthenticate' }
  | { kind: 'other'; message: string };

export const deletionRefusal = (error: unknown): DeletionRefusal => {
  if (error instanceof TRPCClientError) {
    const data = error.data as { code?: string; spaces?: SpaceRef[] | null } | undefined;
    if (data?.code === 'CONFLICT' && data.spaces) return { kind: 'last-admin', spaces: data.spaces };
    if (data?.code === 'PRECONDITION_FAILED') return { kind: 'reauthenticate' };
  }
  return {
    kind: 'other',
    message: error instanceof Error && error.message ? error.message : 'Your account could not be deleted',
  };
};
