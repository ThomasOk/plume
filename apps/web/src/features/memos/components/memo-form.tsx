import { zodResolver } from '@hookform/resolvers/zod';
import { createMemoSchema, MAX_MEMO_CHARACTERS } from '@repo/api/schemas';
import { Card, CardContent } from '@repo/ui/components/card';
import { cn } from '@repo/ui/lib/utils';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { MdOutlineCloseFullscreen, MdOutlineOpenInFull } from 'react-icons/md';
import { toast } from 'sonner';
import { z } from 'zod';
import { useCreateComment } from '../hooks/use-create-comment';
import { useCreateMemo } from '../hooks/use-create-memo';
import { useCreateSpaceMemo } from '../hooks/use-create-space-memo';
import { useDraft } from '../hooks/use-draft';
import { useMemoScope } from '../hooks/use-memo-scope';
import { AudienceSelector, SpaceAudience, type PersonalAudience } from './audience-selector';
import { MemoFooter } from './memo-footer';
import { MemoTextarea } from './memo-textarea';
import { AttachmentList, useFileUpload } from '@/features/attachments';
import { useAuth } from '@/features/auth/hooks/use-auth';
// By path rather than through the spaces barrel, which itself imports this feature.
import { useSpace } from '@/features/spaces/hooks/use-space';
import { sounds } from '@/lib/sounds';

type CreateMemoInput = z.infer<typeof createMemoSchema>;

interface MemoFormProps {
  parentMemoId?: string;
  onSuccess?: () => void;
  /** Offers a Cancel button, for a form opened on demand. The draft stays for next time. */
  onCancel?: () => void;
  /** Puts the caret in the text field on mount, for a form the reader just asked for. */
  autoFocus?: boolean;
}

export const MemoForm = ({ parentMemoId, onSuccess, onCancel, autoFocus = false }: MemoFormProps) => {
  const isComment = Boolean(parentMemoId);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
    setValue,
  } = useForm<CreateMemoInput>({
    resolver: zodResolver(createMemoSchema),
    defaultValues: {
      content: '',
    },
  });

  // The form writes into the scope on screen, read from the URL: inside a space the memo
  // goes into it with no choice offered, and a personal memo is private or public. The
  // audience is not part of the form, so a reset after saving keeps it.
  const scope = useMemoScope();
  const [personalAudience, setPersonalAudience] = useState<PersonalAudience>({ kind: 'private' });
  // The space page has already fetched it: the form reads its title from the cache.
  const space = useSpace(scope.kind === 'space' && !isComment ? scope.spaceId : undefined);

  const { user } = useAuth();

  const closeFocusMode = () => {
    setIsFocusMode(false);
    sounds.collapse();
  };
  // Each scope keeps its own draft, so text started for one audience never reappears,
  // pre-filled, in another. Comments have their own key so they don't overwrite it.
  const draftKey = isComment
    ? `comment-draft-${parentMemoId}`
    : scope.kind === 'space'
      ? `memo-draft-space-${scope.spaceId}`
      : 'memo-draft';
  const { getDraft, saveDraft, clearDraft } = useDraft(user?.id, draftKey);
  const createMemo = useCreateMemo();
  const createSpaceMemo = useCreateSpaceMemo();
  // useCreateComment must always be called (rules of hooks) — parentMemoId ?? '' is safe
  // because createComment is only used when isComment is true
  const createComment = useCreateComment(parentMemoId ?? '');
  const { localFiles, fileInputRef, triggerFileSelect, handleFilesSelected, removeLocalFile, confirmAll, clearAll, isUploading } = useFileUpload();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { ref: registerRef, ...rest } = register('content');
  const content = watch('content');
  const charCount = content.length;
  const isOverLimit = charCount > MAX_MEMO_CHARACTERS;

  // Restore draft on mount (once user is available)
  const hasRestoredDraft = useRef(false);
  useEffect(() => {
    if (!user?.id || hasRestoredDraft.current) return;
    hasRestoredDraft.current = true;
    const saved = getDraft();
    if (saved) setValue('content', saved);
  }, [user?.id, getDraft, setValue]);

  // Auto-save draft on content change
  useEffect(() => {
    saveDraft(content);
  }, [content, saveDraft]);

  // Re-focus inline textarea when focus mode closes
  const wasFocusModeRef = useRef(false);
  useEffect(() => {
    if (wasFocusModeRef.current && !isFocusMode) {
      textareaRef.current?.focus();
    }
    wasFocusModeRef.current = isFocusMode;
  }, [isFocusMode]);

  // Body scroll lock while in focus mode
  useEffect(() => {
    if (!isFocusMode) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFocusMode]);

  // Escape key to exit focus mode
  useEffect(() => {
    if (!isFocusMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFocusMode();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isFocusMode]);

  const onSubmit = async (data: CreateMemoInput) => {
    try {
      const newMemo = isComment
        ? await createComment.mutateAsync({ content: data.content, parentId: parentMemoId })
        : scope.kind === 'space'
          ? await createSpaceMemo.mutateAsync({ spaceId: scope.spaceId, content: data.content })
          : await createMemo.mutateAsync({ content: data.content, visibility: personalAudience.kind });
      await confirmAll(newMemo.id);
      clearDraft();
      clearAll();
      reset();
      setIsFocusMode(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save memo');
    }
  };

  const isPending = createComment.isPending || createMemo.isPending || createSpaceMemo.isPending;

  // A comment takes its parent's audience, so it offers no choice.
  const audienceControl = isComment ? undefined : scope.kind === 'space' ? (
    <SpaceAudience title={space.data?.title} />
  ) : (
    <AudienceSelector value={personalAudience} onChange={setPersonalAudience} />
  );

  const onInsert = (text: string, startIndex: number, length: number) => {
    const currentValue = textareaRef.current?.value ?? '';
    const newValue =
      currentValue.slice(0, startIndex) +
      text +
      currentValue.slice(startIndex + length);
    setValue('content', newValue);
  };

  return (
    <>
      {/* Normal card — kept in DOM to preserve layout space, invisible when focus mode active */}
      <div className={cn('mb-2', isFocusMode && 'invisible')}>
        <Card className="py-3 rounded-xl relative">
          <button
            type="button"
            onClick={() => {
              setIsFocusMode(true);
              sounds.expand();
            }}
            aria-label="Enter focus mode"
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors duration-150 p-1 rounded"
          >
            <MdOutlineOpenInFull className="size-4" />
          </button>
          <CardContent className="px-4 pr-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <MemoTextarea
                textareaRef={textareaRef}
                registerRef={registerRef}
                fieldProps={rest}
                isPending={isPending}
                onSubmit={handleSubmit(onSubmit)}
                onInsert={onInsert}
                placeholder={isComment ? 'Write a comment...' : 'Write your memo here...'}
                autoFocus={autoFocus}
                errorMessage={errors.content?.message}
              />
              <AttachmentList
                localFiles={localFiles}
                onRemoveLocalFile={removeLocalFile}
              />
              <MemoFooter
                charCount={charCount}
                isOverLimit={isOverLimit}
                isPending={isPending || isUploading}
                isValid={isValid}
                audienceControl={audienceControl}
                onCancel={onCancel}
                onAttachFile={triggerFileSelect}
                editorRef={textareaRef}
                onInsert={onInsert}
              />
            </form>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Focus mode overlay rendered in a portal */}
      {createPortal(
        <AnimatePresence>
          {isFocusMode && (
            <>
              {/* Backdrop */}
              <motion.div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.2,
                  ease: 'easeOut',
                }}
                onClick={closeFocusMode}
              />

              {/* Card */}
              <div className="fixed inset-4 z-50 flex items-center justify-center pointer-events-none">
                <motion.div
                  className="w-full max-w-5xl h-full pointer-events-auto"
                  initial={{
                    opacity: 0,
                    scale: prefersReducedMotion ? 1 : 0.98,
                  }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 }}
                  transition={{
                    type: 'spring',
                    bounce: 0.1,
                    duration: prefersReducedMotion ? 0 : 0.3,
                  }}
                >
                  <Card className="rounded-xl h-full flex flex-col py-0 relative">
                    <button
                      type="button"
                      onClick={closeFocusMode}
                      aria-label="Exit focus mode"
                      className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground transition-colors duration-150 p-1 rounded"
                    >
                      <MdOutlineCloseFullscreen className="size-4" />
                    </button>
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
                            isPending={isPending}
                            onSubmit={handleSubmit(onSubmit)}
                            onInsert={onInsert}
                            placeholder={isComment ? 'Write a comment...' : 'Write your memo here...'}
                            autoFocus
                            errorMessage={errors.content?.message}
                          />
                        </div>
                        <AttachmentList
                          localFiles={localFiles}
                          onRemoveLocalFile={removeLocalFile}
                        />
                        <MemoFooter
                          charCount={charCount}
                          isOverLimit={isOverLimit}
                          isPending={isPending || isUploading}
                          isValid={isValid}
                          audienceControl={audienceControl}
                          onCancel={onCancel}
                          onAttachFile={triggerFileSelect}
                          editorRef={textareaRef}
                          onInsert={onInsert}
                        />
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};
