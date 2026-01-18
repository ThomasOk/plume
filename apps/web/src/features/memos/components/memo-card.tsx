import { zodResolver } from '@hookform/resolvers/zod';
import { updateMemoSchema } from '@repo/api/schemas';
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
import { formatDistanceToNow, format } from 'date-fns';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MdMoreVert } from 'react-icons/md';
import { toast } from 'sonner';
import type { Memo } from '@/lib/types';
import type z from 'zod';
import { useDeleteMemo, useUpdateMemo } from '../hooks';

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
  } = useForm<UpdateMemoInput>({
    resolver: zodResolver(updateMemoSchema),
    defaultValues: {
      id: memo.id,
      content: memo.content,
    },
  });

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
      <Card className="py-3 rounded-xl transition-all hover:shadow-md hover:border-primary/50">
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

                <div className="flex justify-end gap-2">
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
                    disabled={!isValid || updateMemo.isPending}
                  >
                    {updateMemo.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {memo.content}
              </p>
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
