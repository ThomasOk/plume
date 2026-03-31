import { createFileRoute, redirect } from '@tanstack/react-router';
import { authClient } from '@/lib/authClient';
import { useAttachments } from '@/features/attachments';
import { SavedAttachmentItem } from '@/features/attachments';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';
import { toast } from 'sonner';

export const Route = createFileRoute('/attachments')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.user) {
      throw redirect({ to: '/sign-in' });
    }
  },
  component: AttachmentsPage,
});

function AttachmentsPage() {
  const { data: attachments, isLoading } = useAttachments();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteAttachment = useMutation({
    ...trpc.attachments.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.attachments.pathKey() });
      toast.success('Attachment deleted');
    },
    onError: () => toast.error('Failed to delete attachment'),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Attachments</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Attachments</h1>

      {!attachments || attachments.length === 0 ? (
        <p className="text-muted-foreground">No attachments yet.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {attachments.map((attachment) => (
            <SavedAttachmentItem
              key={attachment.id}
              attachment={attachment}
              onRemove={(id) => deleteAttachment.mutate({ id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
