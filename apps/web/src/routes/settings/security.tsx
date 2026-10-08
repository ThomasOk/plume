import { createFileRoute } from '@tanstack/react-router';
import { PasswordSection } from '@/features/account/components/password-section';

export const Route = createFileRoute('/settings/security')({
  component: SecuritySettings,
});

function SecuritySettings() {
  return <PasswordSection />;
}
