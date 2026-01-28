import { zodResolver } from '@hookform/resolvers/zod';
import { createMemoSchema, MAX_MEMO_CHARACTERS } from '@repo/api/schemas';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import { Textarea } from '@repo/ui/components/textarea';
import { cn } from '@repo/ui/lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateMemo } from '../hooks/use-create-memo';

type CreateMemoInput = z.infer<typeof createMemoSchema>;

export const MemoForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<CreateMemoInput>({
    resolver: zodResolver(createMemoSchema),
    defaultValues: {
      content: '',
    },
  });
  const createMemo = useCreateMemo();

  const content = watch('content');
  const charCount = content.length;
  const remaining = MAX_MEMO_CHARACTERS - charCount;
  const isOverLimit = charCount > MAX_MEMO_CHARACTERS;

  const onSubmit = (data: CreateMemoInput) => {
    createMemo.mutate(data, {
      onSuccess: () => {
        reset();
      },
    });
  };

  return (
    <Card className="py-3 rounded-xl mb-2">
      <CardContent className="px-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Textarea
              className="resize-none border-0 focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none p-0 shadow-none"
              placeholder="Write your memo here..."
              {...register('content')}
              disabled={createMemo.isPending}
            />
            {errors.content && (
              <p className="text-sm text-destructive mt-1">
                {errors.content.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isOverLimit
                      ? 'text-red-600'
                      : remaining < 1000
                        ? 'text-orange-600'
                        : 'text-muted-foreground'
                  )}
                >
                  {charCount.toLocaleString()} / {MAX_MEMO_CHARACTERS.toLocaleString()}
                </span>
                {isOverLimit && (
                  <span className="text-red-600 text-xs font-medium">
                    {Math.abs(remaining).toLocaleString()} characters over limit
                  </span>
                )}
                {!isOverLimit && remaining < 1000 && remaining > 0 && (
                  <span className="text-orange-600 text-xs">
                    {remaining.toLocaleString()} characters remaining
                  </span>
                )}
              </div>
              {isOverLimit && (
                <p className="text-xs text-red-600">
                  Please remove {Math.abs(remaining).toLocaleString()} characters to save
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {createMemo.error && (
                <p className="text-sm text-destructive">
                  {createMemo.error.message}
                </p>
              )}
              <Button
                type="submit"
                disabled={!isValid || createMemo.isPending || isOverLimit}
              >
                {createMemo.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
