import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { useRef, useState } from 'react';
import { useTRPC } from '@/lib/api';

export interface LocalFile {
  // Client-side temporary ID (not the server attachment ID)
  localId: string;
  file: File;
  // Object URL for immediate preview before upload completes
  previewUrl: string;
  // Set once the server has accepted the file and returned an attachment ID
  attachmentId?: string;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
}

interface UseFileUploadOptions {
  // When provided (edit mode), attachments are confirmed immediately after upload.
  // When absent (create mode), call confirmAll(memoId) after the memo is saved.
  memoId?: string;
}

export const useFileUpload = (options?: UseFileUploadOptions) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUploadUrlMutation = useMutation(
    trpc.attachments.getUploadUrl.mutationOptions(),
  );
  const confirmUploadMutation = useMutation(
    trpc.attachments.confirmUpload.mutationOptions(),
  );
  const deleteUploadMutation = useMutation(
    trpc.attachments.delete.mutationOptions(),
  );

  const uploadFile = async (localId: string, file: File) => {
    try {
      // Step 1 — Ask our server for a presigned PUT URL and create the DB row
      const { id: attachmentId, uploadUrl, contentDisposition } =
        await getUploadUrlMutation.mutateAsync({
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        });

      // Step 2 — PUT the file directly to R2 (bypasses our server).
      // Content-Disposition must match exactly what was signed in the presigned URL.
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Content-Disposition': contentDisposition,
        },
      });

      if (!response.ok) {
        throw new Error(`R2 upload failed: ${response.status}`);
      }

      // Step 3 — In edit mode, confirm immediately so the file is linked to the memo
      if (options?.memoId) {
        await confirmUploadMutation.mutateAsync({
          id: attachmentId,
          memoId: options.memoId,
        });
      }

      setLocalFiles((prev) =>
        prev.map((f) =>
          f.localId === localId ? { ...f, status: 'ready', attachmentId } : f,
        ),
      );
    } catch {
      setLocalFiles((prev) =>
        prev.map((f) =>
          f.localId === localId
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f,
        ),
      );
    }
  };

  const handleFilesSelected = (files: FileList) => {
    const newFiles: LocalFile[] = Array.from(files).map((file) => ({
      localId: nanoid(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'uploading' as const,
    }));

    setLocalFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach(({ localId, file }) => uploadFile(localId, file));
  };

  const removeLocalFile = (localId: string) => {
    setLocalFiles((prev) => {
      const target = prev.find((f) => f.localId === localId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.attachmentId) {
          deleteUploadMutation
            .mutateAsync({ id: target.attachmentId })
            .then(() => {
              queryClient.invalidateQueries({
                queryKey: trpc.attachments.list.queryKey(),
              });
            })
            .catch(console.error);
        }
      }
      return prev.filter((f) => f.localId !== localId);
    });
  };

  // Called in create mode after the memo has been saved and we have its ID
  const confirmAll = async (memoId: string) => {
    const ready = localFiles.filter(
      (f) => f.status === 'ready' && f.attachmentId,
    );
    await Promise.all(
      ready.map((f) =>
        confirmUploadMutation.mutateAsync({ id: f.attachmentId!, memoId }),
      ),
    );
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const clearAll = () => {
    localFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setLocalFiles([]);
  };

  const isUploading = localFiles.some((f) => f.status === 'uploading');

  return {
    localFiles,
    fileInputRef,
    triggerFileSelect,
    handleFilesSelected,
    removeLocalFile,
    confirmAll,
    clearAll,
    isUploading,
  };
};
