import { createFileRoute } from '@tanstack/react-router';
import { ProfileSection } from '@/features/account/components/profile-section';
import { authClient } from '@/lib/authClient';

export const Route = createFileRoute('/settings/account')({
  component: AccountSettings,
});

function AccountSettings() {
  const { data: session } = authClient.useSession();

  if (!session) return null;

  return (
    <ProfileSection name={session.user.name} email={session.user.email} />
  );
}
