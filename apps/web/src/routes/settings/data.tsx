import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/data')({
  component: DataSettings,
});

function DataSettings() {
  return (
    <p className="text-sm text-muted-foreground">
      Data settings will appear here.
    </p>
  );
}
