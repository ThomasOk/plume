import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

interface UseAcceptInvitationOptions {
  onJoined: (spaceId: string) => void;
}

/**
 * `onJoined` is a hook-level callback on purpose. The callbacks passed to `mutate` are dropped
 * if the calling component unmounts first, and right after sign-up the root layout briefly
 * swaps the page for a spinner while the session refreshes: the invitee would be made a member
 * and left on the invitation page.
 */
export const useAcceptInvitation = ({ onJoined }: UseAcceptInvitationOptions) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.invitations.accept.mutationOptions(),
    onSuccess: ({ spaceId }) => {
      // The new space appears in the switcher.
      queryClient.invalidateQueries({ queryKey: trpc.spaces.list.queryKey() });
      onJoined(spaceId);
    },
  });
};
