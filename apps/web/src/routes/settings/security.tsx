import { createFileRoute } from '@tanstack/react-router';
import { PasswordSection } from '@/features/account/components/password-section';
import { SessionsSection } from '@/features/account/components/sessions-section';
import { authClient } from '@/lib/authClient';

export const Route = createFileRoute('/settings/security')({
  component: SecuritySettings,
});

function SecuritySettings() {
  const { data: session } = authClient.useSession();

  return (
    <div className="space-y-10">
      <PasswordSection />
      {session && <SessionsSection currentSessionId={session.session.id} />}
    </div>
  );
}
