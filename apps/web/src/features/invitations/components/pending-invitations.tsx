import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useInvitations } from '../hooks/use-invitations';
import { useRevokeInvitation } from '../hooks/use-revoke-invitation';

interface PendingInvitationsProps {
  spaceId: string;
}

export const PendingInvitations = ({ spaceId }: PendingInvitationsProps) => {
  const invitations = useInvitations(spaceId);
  const revoke = useRevokeInvitation();

  const onRevoke = async (invitationId: string) => {
    try {
      await revoke.mutateAsync({ spaceId, invitationId });
    } catch {
      toast.error('Failed to revoke the invitation');
    }
  };

  if (invitations.isLoading) {
    return <p className="text-muted-foreground text-sm">Loading invitations…</p>;
  }
  if (invitations.error) {
    return <p className="text-destructive text-sm">Something went wrong. Please try again.</p>;
  }
  if (!invitations.data?.length) {
    return <p className="text-muted-foreground text-sm">No pending invitations.</p>;
  }

  return (
    <ul className="divide-y rounded-md border" aria-label="Pending invitations">
      {invitations.data.map((invitation) => (
        <li key={invitation.id} className="flex items-center gap-3 px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="truncate">{invitation.email}</p>
            <p className="text-muted-foreground text-xs">
              {invitation.expired
                ? 'Expired — invite again to send a new link'
                : `Expires ${formatDistanceToNow(invitation.expiresAt, { addSuffix: true })}`}
            </p>
          </div>
          <Badge variant="secondary">{invitation.role === 'admin' ? 'Admin' : 'Member'}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRevoke(invitation.id)}
            disabled={revoke.isPending}
            aria-label={`Revoke invitation for ${invitation.email}`}
          >
            Revoke
          </Button>
        </li>
      ))}
    </ul>
  );
};
