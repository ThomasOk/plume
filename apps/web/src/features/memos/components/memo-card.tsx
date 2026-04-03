import { zodResolver } from '@hookform/resolvers/zod';
import { updateMemoSchema, MAX_MEMO_CHARACTERS } from '@repo/api/schemas';
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
import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/tooltip';
import { Link } from '@tanstack/react-router';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/avatar';
import { formatDistanceToNow, format } from 'date-fns';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { IoEarthOutline } from 'react-icons/io5';
import {
  MdMoreVert,
  MdOutlineCloseFullscreen,
  MdOutlineDelete,
  MdOutlineEdit,
  MdOutlineOpenInFull,
  MdOutlineOpenInNew,
} from 'react-icons/md';
import { toast } from 'sonner';
import type { Author, Comment, Memo } from '@/lib/types';
import type z from 'zod';
import { MemoContext } from '../contexts/memo-context';
import { useDeleteComment, useDeleteMemo, useUpdateMemo } from '../hooks';
import { CommentPreview } from './comment-preview';
import { MemoFooter } from './memo-footer';
import { MemoTextarea } from './memo-textarea';
import { ExpandableMarkdown } from '@/components/markdown/expandable-markdown';
import { sounds } from '@/lib/sounds';
import {
  AttachmentList,
  usePublicAttachmentsByMemo,
  useDeleteAttachment,
  useFileUpload,
} from '@/features/attachments';

interface MemoCardProps {
  memo: Memo | Comment;
  author?: Author;
  hideCommentPreview?: boolean;
}
type UpdateMemoInput = z.infer<typeof updateMemoSchema>;

export const MemoCard = ({ memo, author, hideCommentPreview = false }: MemoCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { data: attachments } = usePublicAttachmentsByMemo(memo.id);
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
  const [isFocusMode, setIsFocusMode] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

  const updateMemo = useUpdateMemo();
  const isComment = !!memo.parentId;
  const deleteMemo = useDeleteMemo();
  const deleteComment = useDeleteComment(memo.parentId ?? '');
  const deleteAction = isComment ? deleteComment : deleteMemo;

  const closeFocusMode = () => {
    setIsFocusMode(false);
    sounds.collapse();
  };

  // Body scroll lock while in focus mode
  useEffect(() => {
    if (!isFocusMode) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFocusMode]);

  // Re-focus inline textarea when focus mode closes
  const wasFocusModeRef = useRef(false);
  useEffect(() => {
    if (wasFocusModeRef.current && !isFocusMode && isEditing) {
      textareaRef.current?.focus();
    }
    wasFocusModeRef.current = isFocusMode;
  }, [isFocusMode, isEditing]);

  // Escape key to exit focus mode
  useEffect(() => {
    if (!isFocusMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFocusMode();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isFocusMode]);

  const exitEdit = () => {
    setIsEditing(false);
    setIsFocusMode(false);
    reset();
    clearAll();
  };

  const onSubmit = (data: UpdateMemoInput) => {
    updateMemo.mutate(data, {
      onSuccess: () => {
        setIsEditing(false);
        setIsFocusMode(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const handleDelete = () => {
    deleteAction.mutate(
      { id: memo.id },
      {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          toast.success(isComment ? 'Comment deleted successfully' : 'Memo deleted successfully');
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  return (
    <>
      <Card
        data-testid="memo-card"
        className="py-3 rounded-xl transition-[box-shadow,border-color] duration-200 ease-out hover:shadow-md hover:border-primary/50"
      >
        <CardContent>
          <div>
            {/* Header with actions menu */}
            <div className="flex justify-between items-center gap-1">
              {/* Header left — hidden while editing */}
              {!isEditing ? (
                <div className="flex items-center gap-2 min-w-0">
                  {author && (
                    <Avatar className="size-7 shrink-0">
                      <AvatarImage src={author.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {author.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col min-w-0">
                    {author && (
                      <span className="text-xs font-medium truncate leading-tight">
                        {author.name}
                      </span>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            to="/memos/$memoId"
                            params={{ memoId: memo.id }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors leading-tight"
                          >
                            <time dateTime={memo.createdAt.toISOString()}>
                              {formatDistanceToNow(memo.createdAt, { addSuffix: true })}
                            </time>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{format(memo.createdAt, 'PPpp')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-1">
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsFocusMode(true);
                    sounds.expand();
                  }}
                  aria-label="Enter focus mode"
                  className="text-muted-foreground hover:text-foreground transition-colors duration-150 p-1 rounded"
                >
                  <MdOutlineOpenInFull className="size-4" />
                </button>
              )}
              {memo.visibility === 'public' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center">
                        <IoEarthOutline className="size-4 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Public</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!isEditing && (
                <DropdownMenu onOpenChange={(open) => { if (open) sounds.pop(); }}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Memo actions"
                    >
                      <MdMoreVert className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/memos/$memoId" params={{ memoId: memo.id }}>
                        <MdOutlineOpenInNew className="size-4" />
                        Open
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <MdOutlineEdit className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { sounds.warning(); setIsDeleteDialogOpen(true); }}
                    >
                      <MdOutlineDelete className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              </div>
            </div>

            {/* Memo content or edit form */}
            {isEditing ? (
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
                />
                <AttachmentList
                  localFiles={localFiles}
                  savedAttachments={attachments}
                  onRemoveLocalFile={removeLocalFile}
                  onRemoveSavedAttachment={(id) => deleteAttachment.mutate({ id })}
                />
                <MemoFooter
                  charCount={charCount}
                  isOverLimit={isOverLimit}
                  isPending={updateMemo.isPending || isUploading}
                  isValid={isValid}
                  visibility={visibility}
                  onVisibilityChange={(val) => setValue('visibility', val)}
                  onCancel={exitEdit}
                  onAttachFile={triggerFileSelect}
                />
              </form>
            ) : (
              <MemoContext.Provider value={{ memo }}>
                <ExpandableMarkdown content={memo.content} maxHeight={500} />
                {attachments && attachments.length > 0 && (
                  <AttachmentList savedAttachments={attachments} />
                )}
                {'commentCount' in memo && memo.commentCount > 0 && !hideCommentPreview && (
                  <CommentPreview memoId={memo.id} commentCount={memo.commentCount} />
                )}
              </MemoContext.Provider>
            )}

          </div>
        </CardContent>
      </Card>

      {/* Focus mode overlay for edit */}
      {createPortal(
        <AnimatePresence>
          {isFocusMode && isEditing && (
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
                            isPending={updateMemo.isPending}
                            onSubmit={handleSubmit(onSubmit)}
                            onInsert={onInsert}
                            autoFocus
                          />
                        </div>
                        <AttachmentList
                          localFiles={localFiles}
                          savedAttachments={attachments}
                          onRemoveLocalFile={removeLocalFile}
                          onRemoveSavedAttachment={(id) => deleteAttachment.mutate({ id })}
                        />
                        <MemoFooter
                          charCount={charCount}
                          isOverLimit={isOverLimit}
                          isPending={updateMemo.isPending || isUploading}
                          isValid={isValid}
                          visibility={visibility}
                          onVisibilityChange={(val) =>
                            setValue('visibility', val)
                          }
                          onCancel={exitEdit}
                          onAttachFile={triggerFileSelect}
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

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isComment ? 'Are you sure you want to delete this comment?' : 'Are you sure you want to delete this memo?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your{' '}
              {isComment ? 'comment' : 'memo'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                sounds.click();
                handleDelete();
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
