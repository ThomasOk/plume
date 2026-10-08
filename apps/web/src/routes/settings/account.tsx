import { createFileRoute } from '@tanstack/react-router';
import { DeleteAccountSection } from '@/features/account/components/delete-account-section';
import { ProfileSection } from '@/features/account/components/profile-section';
import { authClient } from '@/lib/authClient';

export const Route = createFileRoute('/settings/account')({
  component: AccountSettings,
});

function AccountSettings() {
  const { data: session } = authClient.useSession();

  if (!session) return null;

  return (
    <div className="space-y-10">
      <ProfileSection name={session.user.name} email={session.user.email} />
      <DeleteAccountSection email={session.user.email} />
    </div>
  );
}
