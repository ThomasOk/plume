import { Button } from '@repo/ui/components/button';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { GiFeather } from 'react-icons/gi';
import { useAcceptInvitation } from '../hooks/use-accept-invitation';
import { useInvitationPreview } from '../hooks/use-invitation-preview';
import { invitationRefusal } from '../invitation-errors';
import Spinner from '@/components/ui/spinner';
import { authClient } from '@/lib/authClient';

interface InvitationCardProps {
  token: string;
  // Accept as soon as the user is signed in. Set when they come back from signing in or up
  // through this card's own buttons, which is where they already said "join".
  autoAccept: boolean;
  onJoined: (spaceId: string) => void;
}

/**
 * The page an invitation link opens. It works signed out: the link is the credential, so the
 * invitee sees where it leads before having an account, and the token rides through sign-in
 * or sign-up in the redirect back here.
 */
export const InvitationCard = ({ token, autoAccept, onJoined }: InvitationCardProps) => {
  const { data: session } = authClient.useSession();
  const preview = useInvitationPreview(token);
  const accept = useAcceptInvitation({ onJoined });
  const signedIn = !!session?.user;

  const join = () => accept.mutate({ token });

  const autoAccepted = useRef(false);
  useEffect(() => {
    if (!autoAccept || !signedIn || !preview.data || autoAccepted.current) return;
    autoAccepted.current = true;
    join();
    // `join` is recreated each render; the ref is what makes this run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAccept, signedIn, preview.data]);

  const refusal = invitationRefusal(preview.error) ?? invitationRefusal(accept.error);
  const returnHere = `/invitations/${token}?accept=true`;

  return (
    <div className="w-full max-w-sm mx-auto pt-16 space-y-6 text-center">
      <GiFeather className="h-12 w-12 text-primary mx-auto" />

      {refusal === 'expired' && (
        <p>This invitation has expired. Ask the person who invited you for a new one.</p>
      )}
      {refusal === 'invalid' && (
        <p>
          This invitation is no longer valid. It may have been used already, revoked, or replaced
          by a newer one.
        </p>
      )}
      {refusal === 'already-member' && (
        <p>
          You are already a member of this space. The link stays valid for the person it was
          sent to.
        </p>
      )}
      {!refusal && (preview.error || accept.error) && (
        <p className="text-destructive">Something went wrong. Please try again.</p>
      )}

      {!refusal && preview.isLoading && <Spinner className="mx-auto" />}

      {!refusal && preview.data && (
        <>
          <div className="space-y-2">
            <h1 className="text-xl">Join {preview.data.spaceTitle}</h1>
            <p className="text-muted-foreground">
              {preview.data.inviterName} invited you to join as{' '}
              {preview.data.role === 'admin' ? 'an admin' : 'a member'}.
            </p>
          </div>

          {signedIn ? (
            <Button size="lg" className="w-full" onClick={join} disabled={accept.isPending}>
              {accept.isPending && <Spinner className="mr-2 size-4" />}
              Join {preview.data.spaceTitle}
            </Button>
          ) : (
            <div className="space-y-3">
              <Button asChild size="lg" className="w-full">
                <Link to="/sign-up" search={{ redirect: returnHere }}>
                  Create an account to join
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="w-full">
                <Link to="/sign-in" search={{ redirect: returnHere }}>
                  Sign in to join
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
