import { may } from '@repo/api/schemas';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { InviteForm, PendingInvitations } from '@/features/invitations';
import { MemberList, useSpace } from '@/features/spaces';
import { isNotFound } from '@/lib/trpc-errors';

export const Route = createFileRoute('/(memos)/(private)/spaces/$spaceId_/members')({
  component: MembersPage,
});

function MembersPage() {
  const { spaceId } = Route.useParams();
  const space = useSpace(spaceId);
  const navigate = useNavigate();

  // A non-admin is told the same as a non-member: there is nothing here for them.
  if (isNotFound(space.error) || (space.data && !may(space.data.role, 'manageMembership'))) {
    return (
      <div className="container mx-auto px-4 pt-4 pb-8 max-w-3xl">
        <p className="text-muted-foreground">Space not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-4 pb-8 max-w-3xl space-y-8">
      <div>
        <Link
          to="/spaces/$spaceId"
          params={{ spaceId }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {space.data?.title}
        </Link>
        <h1 className="text-xl font-semibold mt-1">Members</h1>
      </div>
      {space.data && (
        <>
          <section>
            <MemberList
              spaceId={spaceId}
              spaceTitle={space.data.title}
              onSelfDemoted={() => navigate({ to: '/spaces/$spaceId', params: { spaceId } })}
            />
          </section>
          <section className="space-y-3">
            <h2 className="font-medium">Invite someone</h2>
            <InviteForm spaceId={spaceId} />
          </section>
          <section className="space-y-3">
            <h2 className="font-medium">Pending invitations</h2>
            <PendingInvitations spaceId={spaceId} />
          </section>
        </>
      )}
    </div>
  );
}
