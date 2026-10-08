import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/security')({
  component: SecuritySettings,
});

function SecuritySettings() {
  return (
    <p className="text-sm text-muted-foreground">
      Security settings will appear here.
    </p>
  );
}
