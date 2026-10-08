import { createFileRoute } from '@tanstack/react-router';
import { ExportSection } from '@/features/account/components/export-section';

export const Route = createFileRoute('/settings/export')({
  component: ExportSection,
});
