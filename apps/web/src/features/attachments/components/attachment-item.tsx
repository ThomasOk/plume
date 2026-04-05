import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { cn } from '@repo/ui/lib/utils';
import { useState } from 'react';
import {
  MdOutlineClose,
  MdOutlineDescription,
  MdOutlineImage,
  MdOutlineMovie,
  MdOutlineAudiotrack,
  MdOutlineArchive,
} from 'react-icons/md';
import type { LocalFile } from '../hooks/use-file-upload';
import type { Attachment } from '@/lib/types';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileIcon = ({ mimeType }: { mimeType: string }) => {
  if (mimeType.startsWith('image/'))
    return <MdOutlineImage className="size-5 text-muted-foreground" />;
  if (mimeType.startsWith('video/'))
    return <MdOutlineMovie className="size-5 text-muted-foreground" />;
  if (mimeType.startsWith('audio/'))
    return <MdOutlineAudiotrack className="size-5 text-muted-foreground" />;
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gz'))
    return <MdOutlineArchive className="size-5 text-muted-foreground" />;
  return <MdOutlineDescription className="size-5 text-muted-foreground" />;
};

interface LocalAttachmentItemProps {
  localFile: LocalFile;
  onRemove: (localId: string) => void;
}

// Displays a file that is being uploaded or has just been uploaded (local state)
export const LocalAttachmentItem = ({
  localFile,
  onRemove,
}: LocalAttachmentItemProps) => {
  const isImage = localFile.file.type.startsWith('image/');

  return (
    <div
      className={cn(
        'relative group flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm max-w-48',
        localFile.status === 'error' && 'border-destructive bg-destructive/5',
        localFile.status === 'uploading' && 'opacity-60',
      )}
    >
      {/* Thumbnail or icon */}
      {isImage ? (
        <img
          src={localFile.previewUrl}
          alt={localFile.file.name}
          className="size-8 rounded object-cover shrink-0"
        />
      ) : (
        <div className="size-8 rounded bg-muted flex items-center justify-center shrink-0">
          <FileIcon mimeType={localFile.file.type} />
        </div>
      )}

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium leading-tight">
          {localFile.file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {localFile.status === 'uploading'
            ? 'Uploading...'
            : localFile.status === 'error'
              ? localFile.error
              : formatFileSize(localFile.file.size)}
        </p>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(localFile.localId)}
        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex size-4 items-center justify-center rounded-full bg-foreground text-background"
        aria-label={`Remove ${localFile.file.name}`}
      >
        <MdOutlineClose className="size-3" />
      </button>
    </div>
  );
};

interface SavedAttachmentItemProps {
  attachment: Attachment;
  onRemove?: (id: string) => void;
}

// Displays a confirmed attachment already saved in the database
export const SavedAttachmentItem = ({
  attachment,
  onRemove,
}: SavedAttachmentItemProps) => {
  const isImage = attachment.mimeType.startsWith('image/');
  const [previewOpen, setPreviewOpen] = useState(false);

  const thumbnail = isImage ? (
    <img
      src={attachment.url}
      alt={attachment.filename}
      className="size-8 rounded object-cover shrink-0"
    />
  ) : (
    <div className="size-8 rounded bg-muted flex items-center justify-center shrink-0">
      <FileIcon mimeType={attachment.mimeType} />
    </div>
  );

  const info = (
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-medium leading-tight">
        {attachment.filename}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatFileSize(attachment.size)}
      </p>
    </div>
  );

  const removeButton = onRemove && (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onRemove(attachment.id);
      }}
      className="absolute -top-1.5 -right-1.5 hidden group-hover:flex size-4 items-center justify-center rounded-full bg-foreground text-background"
      aria-label={`Remove ${attachment.filename}`}
    >
      <MdOutlineClose className="size-3" />
    </button>
  );

  const baseClass =
    'relative group flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm max-w-48 hover:bg-muted/50 transition-colors';

  return (
    <>
      {isImage ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPreviewOpen(true);
          }}
          className={cn(baseClass, 'cursor-zoom-in')}
        >
          {thumbnail}
          {info}
          {removeButton}
        </button>
      ) : (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className={baseClass}
          onClick={(e) => e.stopPropagation()}
        >
          {thumbnail}
          {info}
          {removeButton}
        </a>
      )}

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
