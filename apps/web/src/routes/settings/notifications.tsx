import { createFileRoute } from '@tanstack/react-router';
import { CommentEmailsSection } from '@/features/notifications/components/comment-emails-section';

export const Route = createFileRoute('/settings/notifications')({
  component: CommentEmailsSection,
});
