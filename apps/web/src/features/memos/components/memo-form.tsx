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
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCreateMemo } from '../hooks/use-create-memo';
import { useDraft } from '../hooks/use-draft';
import { MemoFooter } from './memo-footer';
import { MemoTextarea } from './memo-textarea';

type CreateMemoInput = z.infer<typeof createMemoSchema>;

export const MemoForm = () => {
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
      visibility: 'private',
    },
  });

  const { user } = useAuth();
  const { getDraft, saveDraft, clearDraft } = useDraft(user?.id, 'memo-draft');
  const createMemo = useCreateMemo();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { ref: registerRef, ...rest } = register('content');
  const content = watch('content');
  const visibility = watch('visibility') ?? 'private';
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
      if (e.key === 'Escape') setIsFocusMode(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isFocusMode]);

  const onSubmit = (data: CreateMemoInput) => {
    createMemo.mutate(data, {
      onSuccess: () => {
        clearDraft();
        reset();
        setIsFocusMode(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

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
              onClick={() => setIsFocusMode(true)}
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
                  isPending={createMemo.isPending}
                  onSubmit={handleSubmit(onSubmit)}
                  onInsert={onInsert}
                  placeholder="Write your memo here..."
                  errorMessage={errors.content?.message}
                />
                <MemoFooter
                  charCount={charCount}
                  isOverLimit={isOverLimit}
                  isPending={createMemo.isPending}
                  isValid={isValid}
                  visibility={visibility}
                  onVisibilityChange={(val) => setValue('visibility', val)}
                />
              </form>
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
                transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
                onClick={() => setIsFocusMode(false)}
              />

              {/* Card */}
              <div className="fixed inset-4 z-50 flex items-center justify-center pointer-events-none">
                <motion.div
                  className="w-full max-w-5xl h-full pointer-events-auto"
                  initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 }}
                  transition={{ type: 'spring', bounce: 0.1, duration: prefersReducedMotion ? 0 : 0.3 }}
                >
                  <Card className="rounded-xl h-full flex flex-col py-0 relative">
                    <button
                      type="button"
                      onClick={() => setIsFocusMode(false)}
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
                            isPending={createMemo.isPending}
                            onSubmit={handleSubmit(onSubmit)}
                            onInsert={onInsert}
                            placeholder="Write your memo here..."
                            autoFocus
                            errorMessage={errors.content?.message}
                          />
                        </div>
                        <MemoFooter
                  charCount={charCount}
                  isOverLimit={isOverLimit}
                  isPending={createMemo.isPending}
                  isValid={isValid}
                  visibility={visibility}
                  onVisibilityChange={(val) => setValue('visibility', val)}
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
