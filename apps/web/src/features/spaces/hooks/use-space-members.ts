import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

/** The members of a space, with their roles. Admins only: call it only when the user is one. */
export const useSpaceMembers = (spaceId: string) => {
  const trpc = useTRPC();

  return useQuery(trpc.spaces.members.list.queryOptions({ spaceId }));
};
