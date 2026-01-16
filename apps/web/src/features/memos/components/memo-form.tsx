import { zodResolver } from '@hookform/resolvers/zod';
import { createMemoSchema } from '@repo/api/schemas';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import { Textarea } from '@repo/ui/components/textarea';
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
  } = useForm<CreateMemoInput>({
    resolver: zodResolver(createMemoSchema),
    defaultValues: {
      content: '',
    },
  });
  const createMemo = useCreateMemo();

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
              className="resize-none border-0 focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none p-0"
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

          {createMemo.error && (
            <p className="text-sm text-destructive">
              {createMemo.error.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={!isValid || createMemo.isPending}>
              {createMemo.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
