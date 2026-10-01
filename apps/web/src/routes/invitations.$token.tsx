import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { InvitationCard } from '@/features/invitations';

// Outside the private layout on purpose: the invitee may have no account yet.
export const Route = createFileRoute('/invitations/$token')({
  validateSearch: (search) =>
    z.object({ accept: z.boolean().optional().catch(undefined) }).parse(search),
  component: InvitationPage,
});

function InvitationPage() {
  const { token } = Route.useParams();
  const { accept } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <InvitationCard
      token={token}
      autoAccept={accept === true}
      onJoined={(spaceId) => navigate({ to: '/spaces/$spaceId', params: { spaceId } })}
    />
  );
}
