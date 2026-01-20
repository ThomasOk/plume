import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <p className="text-muted-foreground">User settings will appear here.</p>
    </div>
  );
}
