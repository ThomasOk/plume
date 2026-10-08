import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTRPC } from '@/lib/api';
import { authClient } from '@/lib/authClient';

export const useDeleteAccount = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Signing out clears the session cookies, the cached one included: without it the browser
  // would look signed in to a deleted account until the cache expires. The server has
  // already removed the session, so whatever it answers is fine. The cleared query cache
  // drops everything read as this user.
  const signOutToSignIn = async (redirect?: string) => {
    await authClient.signOut();
    queryClient.clear();
    navigate({ to: '/sign-in', search: redirect ? { redirect } : {} });
  };

  const mutation = useMutation({
    ...trpc.account.delete.mutationOptions(),
    onSuccess: () => signOutToSignIn(),
  });

  return {
    ...mutation,
    // A fresh sign-in is what an account without a password proves itself with; the user
    // comes back to the Account section to try again.
    signInAgain: () => signOutToSignIn('/settings/account'),
  };
};
