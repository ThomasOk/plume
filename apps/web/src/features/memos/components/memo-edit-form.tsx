import { zodResolver } from '@hookform/resolvers/zod';
import { updateMemoSchema, MAX_MEMO_CHARACTERS } from '@repo/api/schemas';
import { CardContent } from '@repo/ui/components/card';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MdOutlineOpenInFull } from 'react-icons/md';
import { toast } from 'sonner';
import type { MemoViewScope } from '../types';
import type { Comment, Memo } from '@/lib/types';
import type z from 'zod';
import { useUpdateMemo } from '../hooks';
import { AudienceSelector, SpaceAudience } from './audience-selector';
import { FocusModeDialog } from './focus-mode-dialog';
import { MemoFooter } from './memo-footer';
import { MemoTextarea } from './memo-textarea';
import { AttachmentList, useDeleteAttachment, useFileUpload } from '@/features/attachments';
// The hook's own module, not the feature's index: `spaces` already imports from `memos`.
import { useSpace } from '@/features/spaces/hooks/use-space';
import { sounds } from '@/lib/sounds';

type UpdateMemoInput = z.infer<typeof updateMemoSchema>;

/**
 * Whether a memo is being edited, and in focus mode. Held by whoever shows the memo, so it
 * can place the focus mode button in its own header, apart from the form.
 */
export const useMemoEditing = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  // Stable, so the effects that depend on them do not run again on every render.
  const startEditing = useCallback(() => setIsEditing(true), []);
  const stopEditing = useCallback(() => {
    setIsEditing(false);
    setIsFocusMode(false);
  }, []);
  const enterFocusMode = useCallback(() => {
    setIsFocusMode(true);
    sounds.expand();
  }, []);
  const exitFocusMode = useCallback(() => {
    setIsFocusMode(false);
    sounds.collapse();
  }, []);
  return { isEditing, isFocusMode, startEditing, stopEditing, enterFocusMode, exitFocusMode };
};

export type MemoEditing = ReturnType<typeof useMemoEditing>;

export const EnterFocusModeButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Enter focus mode"
    className="hit-area relative text-muted-foreground hover:text-foreground transition-colors duration-150 p-1 rounded outline-none focus-visible:ring-1 focus-visible:ring-ring"
  >
    <MdOutlineOpenInFull className="size-4" />
  </button>
);

interface MemoEditFormProps {
  memo: Memo | Comment;
  editing: MemoEditing;
}

/**
 * Edits a memo or a comment in place, and in focus mode. Kept mounted beside the memo and
 * shown while editing, so the focus mode overlay still animates out on save or cancel.
 */
export const MemoEditForm = ({ memo, editing }: MemoEditFormProps) => {
  const { isEditing, isFocusMode, stopEditing, exitFocusMode } = editing;
  const savedAttachments = memo.attachments;
  const deleteAttachment = useDeleteAttachment();
  const {
    localFiles,
    fileInputRef,
    triggerFileSelect,
    handleFilesSelected,
    removeLocalFile,
    isUploading,
    clearAll,
  } = useFileUpload({ memoId: memo.id });
  const {
    register,
    handleSubmit,
    formState: { isValid },
    reset,
    watch,
    setValue,
  } = useForm<UpdateMemoInput>({
    resolver: zodResolver(updateMemoSchema),
    defaultValues: {
      id: memo.id,
      content: memo.content,
      visibility: memo.visibility,
    },
  });

  const content = watch('content');
  const visibility = watch('visibility') ?? 'private';
  const charCount = content.length;
  const isOverLimit = charCount > MAX_MEMO_CHARACTERS;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { ref: registerRef, ...rest } = register('content');

  const onInsert = (text: string, startIndex: number, length: number) => {
    const currentValue = textareaRef.current?.value ?? '';
    const newValue =
      currentValue.slice(0, startIndex) +
      text +
      currentValue.slice(startIndex + length);
    setValue('content', newValue);
  };

  const space = useSpace(memo.spaceId ?? undefined);
  const isComment = !!memo.parentId;
  // Editing suggests the tags of the scope the memo lives in, not of the page showing it.
  const memoScope: MemoViewScope = memo.spaceId
    ? { kind: 'space', spaceId: memo.spaceId }
    : { kind: 'personal' };
  const updateMemo = useUpdateMemo();

  // An edit leaves a memo where it is: a personal memo switches between private and
  // public, a memo in a space shows its space. A comment takes its parent's audience.
  // Outside its space's page, the memo's space is not known, and the label reads "Space".
  const audienceControl = isComment ? undefined : visibility === 'space' ? (
    <SpaceAudience title={space.data?.title} />
  ) : (
    <AudienceSelector
      value={{ kind: visibility }}
      onChange={(audience) => setValue('visibility', audience.kind)}
    />
  );

  // Re-focus inline textarea when focus mode closes
  const wasFocusModeRef = useRef(false);
  useEffect(() => {
    if (wasFocusModeRef.current && !isFocusMode && isEditing) {
      textareaRef.current?.focus();
    }
    wasFocusModeRef.current = isFocusMode;
  }, [isFocusMode, isEditing]);

  // Back to the memo as it stands now, which a save since the form mounted may have changed.
  const exitEdit = () => {
    stopEditing();
    reset({ id: memo.id, content: memo.content, visibility: memo.visibility });
    clearAll();
  };

  const onSubmit = (data: UpdateMemoInput) => {
    updateMemo.mutate(data, {
      onSuccess: stopEditing,
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const attachmentList = (
    <AttachmentList
      localFiles={localFiles}
      savedAttachments={savedAttachments}
      onRemoveLocalFile={removeLocalFile}
      onRemoveSavedAttachment={(id) => deleteAttachment.mutate({ id })}
    />
  );
  const footer = (
    <MemoFooter
      charCount={charCount}
      isOverLimit={isOverLimit}
      isPending={updateMemo.isPending || isUploading}
      isValid={isValid}
      audienceControl={audienceControl}
      onCancel={exitEdit}
      onAttachFile={triggerFileSelect}
      editorRef={textareaRef}
      onInsert={onInsert}
    />
  );

  return (
    <>
      {isEditing && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
          />
          <MemoTextarea
            textareaRef={textareaRef}
            registerRef={registerRef}
            fieldProps={rest}
            isPending={updateMemo.isPending}
            onSubmit={handleSubmit(onSubmit)}
            onInsert={onInsert}
            autoFocus={!isFocusMode}
            scope={memoScope}
          />
          {attachmentList}
          {footer}
        </form>
      )}

      <FocusModeDialog open={isFocusMode && isEditing} onClose={exitFocusMode}>
        <CardContent className="px-4 pr-10 pt-3 pb-4 flex flex-col flex-1 overflow-hidden">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden gap-3"
          >
            <div className="flex-1 overflow-y-auto min-h-0">
              <MemoTextarea
                textareaRef={textareaRef}
                registerRef={registerRef}
                fieldProps={rest}
                isPending={updateMemo.isPending}
                onSubmit={handleSubmit(onSubmit)}
                onInsert={onInsert}
                autoFocus
                scope={memoScope}
              />
            </div>
            {attachmentList}
            {footer}
          </form>
        </CardContent>
      </FocusModeDialog>
    </>
  );
};
