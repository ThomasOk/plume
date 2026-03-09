import { zodResolver } from '@hookform/resolvers/zod';
import { createMemoSchema, MAX_MEMO_CHARACTERS } from '@repo/api/schemas';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import { Textarea } from '@repo/ui/components/textarea';
import { cn } from '@repo/ui/lib/utils';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateMemo } from '../hooks/use-create-memo';
import { TagSuggestions } from './tag-suggestions';
import { VisibilitySelector } from './visibility-selector';

type CreateMemoInput = z.infer<typeof createMemoSchema>;

export const MemoForm = () => {
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
  const createMemo = useCreateMemo();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { ref: registerRef, ...rest } = register('content');
  const content = watch('content');
  const visibility = watch('visibility');
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

  const onInsert = (text: string, startIndex: number, length: number) => {
    const currentValue = textareaRef.current?.value ?? '';
    const newValue =
      currentValue.slice(0, startIndex) +
      text +
      currentValue.slice(startIndex + length);
    setValue('content', newValue);
  };

  return (
    <Card className="py-3 rounded-xl mb-2">
      <CardContent className="px-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="relative">
            <Textarea
              className="resize-none border-0 focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none p-0 shadow-none"
              placeholder="Write your memo here..."
              ref={(el) => {
                registerRef(el);
                textareaRef.current = el;
              }}
              {...rest}
              disabled={createMemo.isPending}
            />
            <TagSuggestions editorRef={textareaRef} onInsert={onInsert} />
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
                    {Math.abs(remaining).toLocaleString()} characters over limit
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

            <div className="flex items-center gap-2">
              {createMemo.error && (
                <p className="text-sm text-destructive">
                  {createMemo.error.message}
                </p>
              )}
              <VisibilitySelector
                value={visibility ?? 'private'}
                onChange={(val) => setValue('visibility', val)}
              />
              <Button
                type="submit"
                size="sm"
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
