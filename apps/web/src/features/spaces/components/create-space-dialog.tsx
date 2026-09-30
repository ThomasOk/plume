import { zodResolver } from '@hookform/resolvers/zod';
import { createSpaceSchema, MAX_SPACE_TITLE_CHARACTERS } from '@repo/api/schemas';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { Space } from '@/lib/types';
import type z from 'zod';
import { useCreateSpace } from '../hooks/use-create-space';

type CreateSpaceInput = z.infer<typeof createSpaceSchema>;

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (space: Space) => void;
}

export const CreateSpaceDialog = ({ open, onOpenChange, onCreated }: CreateSpaceDialogProps) => {
  const createSpace = useCreateSpace();
  const form = useForm<CreateSpaceInput>({
    resolver: zodResolver(createSpaceSchema),
    defaultValues: { title: '' },
  });

  const onSubmit = async (values: CreateSpaceInput) => {
    try {
      const created = await createSpace.mutateAsync(values);
      form.reset();
      onCreated(created);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create space');
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New space</DialogTitle>
          <DialogDescription>
            A space holds memos shared with its members. You will be its admin.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              name="title"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Cooking club"
                      maxLength={MAX_SPACE_TITLE_CHARACTERS}
                      autoComplete="off"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
