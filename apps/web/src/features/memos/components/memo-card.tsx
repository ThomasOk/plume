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
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Textarea } from '@repo/ui/components/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/tooltip';
import { cn } from '@repo/ui/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MdMoreVert } from 'react-icons/md';
import { toast } from 'sonner';
import type { Memo } from '@/lib/types';
import type z from 'zod';
import { MemoContext } from '../contexts/memo-context';
import { useDeleteMemo, useUpdateMemo } from '../hooks';
import { ExpandableMarkdown } from '@/components/markdown/expandable-markdown';

interface MemoCardProps {
  memo: Memo;
}
type UpdateMemoInput = z.infer<typeof updateMemoSchema>;

export const MemoCard = ({ memo }: MemoCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isValid },
    reset,
    watch,
  } = useForm<UpdateMemoInput>({
    resolver: zodResolver(updateMemoSchema),
    defaultValues: {
      id: memo.id,
      content: memo.content,
    },
  });

  const content = watch('content');
  const charCount = content.length;
  const remaining = MAX_MEMO_CHARACTERS - charCount;
  const isOverLimit = charCount > MAX_MEMO_CHARACTERS;

  const updateMemo = useUpdateMemo();
  const deleteMemo = useDeleteMemo();

  const onSubmit = (data: UpdateMemoInput) => {
    updateMemo.mutate(data, {
      onSuccess: () => {
        setIsEditing(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const handleDelete = () => {
    deleteMemo.mutate(
      { id: memo.id },
      {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          toast.success('Memo deleted successfully');
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  return (
    <>
      <Card className="py-3 rounded-xl transition-all hover:shadow-md hover:border-primary/50 overflow-hidden">
        <CardContent>
          <div>
            {/* Header with actions menu */}
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MdMoreVert className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Memo content */}
            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Textarea
                    className="resize-none border-0 focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none p-0"
                    {...register('content')}
                    disabled={updateMemo.isPending}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-sm font-medium transition-colors',
                          isOverLimit
                            ? 'text-destructive'
                            : remaining < 1000
                              ? 'text-destructive/70'
                              : 'text-muted-foreground',
                        )}
                      >
                        {charCount.toLocaleString()} /{' '}
                        {MAX_MEMO_CHARACTERS.toLocaleString()}
                      </span>
                      {isOverLimit && (
                        <span className="text-destructive text-xs font-medium">
                          {Math.abs(remaining).toLocaleString()} characters over
                          limit
                        </span>
                      )}
                      {!isOverLimit && remaining < 1000 && remaining > 0 && (
                        <span className="text-destructive/70 text-xs">
                          {remaining.toLocaleString()} characters remaining
                        </span>
                      )}
                    </div>
                    {isOverLimit && (
                      <p className="text-xs text-destructive">
                        Please remove {Math.abs(remaining).toLocaleString()}{' '}
                        characters to save
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={updateMemo.isPending}
                      variant="secondary"
                      onClick={() => {
                        setIsEditing(false);
                        reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!isValid || updateMemo.isPending || isOverLimit}
                    >
                      {updateMemo.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              // <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              //   {memo.content}
              // </p>
              <MemoContext.Provider value={{ memo }}>
                <ExpandableMarkdown content={memo.content} maxHeight={500} />
              </MemoContext.Provider>
            )}
            <div className="flex items-center justify-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <time
                      dateTime={memo.createdAt.toISOString()}
                      className="text-xs text-muted-foreground cursor-help"
                    >
                      {formatDistanceToNow(memo.createdAt, { addSuffix: true })}
                    </time>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{format(memo.createdAt, 'PPpp')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this memo?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              memo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
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
