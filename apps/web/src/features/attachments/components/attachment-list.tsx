import type { LocalFile } from '../hooks/use-file-upload';
import type { Attachment } from '@/lib/types';
import { LocalAttachmentItem, SavedAttachmentItem } from './attachment-item';

interface AttachmentListProps {
  localFiles?: LocalFile[];
  savedAttachments?: Attachment[];
  onRemoveLocalFile?: (localId: string) => void;
  onRemoveSavedAttachment?: (id: string) => void;
}

export const AttachmentList = ({
  localFiles = [],
  savedAttachments = [],
  onRemoveLocalFile,
  onRemoveSavedAttachment,
}: AttachmentListProps) => {
  if (localFiles.length === 0 && savedAttachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {savedAttachments.map((attachment) => (
        <SavedAttachmentItem
          key={attachment.id}
          attachment={attachment}
          onRemove={onRemoveSavedAttachment}
        />
      ))}
      {localFiles.map((localFile) => (
        <LocalAttachmentItem
          key={localFile.localId}
          localFile={localFile}
          onRemove={onRemoveLocalFile ?? (() => {})}
        />
      ))}
    </div>
  );
};
