import { createFileRoute, redirect, Link } from '@tanstack/react-router';
import { authClient } from '@/lib/authClient';
import { useAttachments, useDeleteAttachment } from '@/features/attachments';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  MdOutlineOpenInNew,
  MdOutlineDescription,
  MdOutlineMovie,
  MdOutlineAudiotrack,
  MdOutlineArchive,
  MdOutlineImage,
} from 'react-icons/md';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog';
import { Dialog, DialogContent, DialogTitle } from '@repo/ui/components/dialog';
import { Button } from '@repo/ui/components/button';
import { Separator } from '@repo/ui/components/separator';
import type { Attachment } from '@/lib/types';

export const Route = createFileRoute('/attachments')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.user) {
      throw redirect({ to: '/sign-in' });
    }
  },
  component: AttachmentsPage,
});

const FileIcon = ({ mimeType }: { mimeType: string }) => {
  if (mimeType.startsWith('image/'))
    return <MdOutlineImage className="size-10 text-muted-foreground/50" />;
  if (mimeType.startsWith('video/'))
    return <MdOutlineMovie className="size-10 text-muted-foreground/50" />;
  if (mimeType.startsWith('audio/'))
    return <MdOutlineAudiotrack className="size-10 text-muted-foreground/50" />;
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('gz')
  )
    return <MdOutlineArchive className="size-10 text-muted-foreground/50" />;
  return <MdOutlineDescription className="size-10 text-muted-foreground/50" />;
};

const AttachmentCard = ({ attachment }: { attachment: Attachment }) => {
  const isImage = attachment.mimeType.startsWith('image/');
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div className="w-24 sm:w-32 flex flex-col gap-1">
        {isImage ? (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="w-24 h-24 sm:w-32 sm:h-32 border rounded-xl overflow-hidden flex items-center justify-center bg-muted hover:opacity-80 hover:shadow transition-all cursor-zoom-in"
          >
            <img
              src={attachment.url}
              alt={attachment.filename}
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-24 h-24 sm:w-32 sm:h-32 border rounded-xl overflow-hidden flex items-center justify-center bg-muted hover:opacity-80 hover:shadow transition-all"
          >
            <FileIcon mimeType={attachment.mimeType} />
          </a>
        )}
        <div className="flex items-center gap-1 px-1">
          <p className="text-xs text-muted-foreground truncate flex-1">
            {attachment.filename}
          </p>
          {attachment.memoId && (
            <Link
              to="/memos/$memoId"
              params={{ memoId: attachment.memoId }}
              className="shrink-0 text-primary hover:opacity-70 transition-opacity"
              aria-label="View memo"
            >
              <MdOutlineOpenInNew className="size-3" />
            </Link>
          )}
        </div>
      </div>

      {isImage && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent
            className="!w-screen !h-screen !max-w-screen p-0 border-0 shadow-none bg-transparent [&>button]:hidden"
            aria-describedby={undefined}
          >
            <DialogTitle className="sr-only">{attachment.filename}</DialogTitle>
            <div
              className="w-full h-full flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
              onClick={() => setPreviewOpen(false)}
            >
              <img
                src={attachment.url}
                alt={attachment.filename}
                className="max-w-[90vw] max-h-[90vh] object-contain select-none"
                draggable={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

const groupByMonth = (attachments: Attachment[]): Map<string, Attachment[]> => {
  const map = new Map<string, Attachment[]>();
  for (const attachment of attachments) {
    const key = format(attachment.createdAt, 'yyyy-MM');
    const group = map.get(key) ?? [];
    group.push(attachment);
    map.set(key, group);
  }
  return map;
};

function AttachmentsPage() {
  const { data: attachments, isLoading } = useAttachments();
  const deleteAttachment = useDeleteAttachment();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const linked = attachments?.filter((a) => a.memoId) ?? [];
  const unlinked = attachments?.filter((a) => !a.memoId) ?? [];
  const grouped = groupByMonth(linked);

  const handleDeleteAllUnused = async () => {
    try {
      await Promise.all(
        unlinked.map((a) => deleteAttachment.mutateAsync({ id: a.id })),
      );
      toast.success(`${unlinked.length} attachment(s) deleted`);
    } catch {
      toast.error('Failed to delete some attachments');
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Attachments</h1>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      <h1 className="text-2xl font-bold">Attachments</h1>

      {linked.length === 0 && unlinked.length === 0 ? (
        <p className="text-muted-foreground text-sm">No attachments yet.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Linked attachments grouped by month */}
          {Array.from(grouped.entries()).map(([monthKey, items]) => (
            <div key={monthKey} className="flex flex-row items-start gap-4">
              {/* Date label */}
              <div className="w-16 sm:w-24 pt-1 shrink-0 flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {format(new Date(monthKey), 'yyyy')}
                </span>
                <span className="text-xl font-medium">
                  {format(new Date(monthKey), 'MMM')}
                </span>
              </div>
              {/* Items */}
              <div className="flex flex-wrap gap-4">
                {items.map((attachment) => (
                  <AttachmentCard key={attachment.id} attachment={attachment} />
                ))}
              </div>
            </div>
          ))}

          {/* Unused attachments */}
          {unlinked.length > 0 && (
            <>
              {linked.length > 0 && <Separator />}
              <div className="flex flex-row items-start gap-4">
                <div className="w-16 sm:w-24 shrink-0" />
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Unused ({unlinked.length})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      Delete all unused
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {unlinked.map((attachment) => (
                      <AttachmentCard
                        key={attachment.id}
                        attachment={attachment}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all unused attachments?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {unlinked.length} attachment
              {unlinked.length > 1 ? 's' : ''} not linked to any memo. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAllUnused();
              }}
              disabled={deleteAttachment.isPending}
            >
              {deleteAttachment.isPending ? 'Deleting...' : 'Delete all'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
