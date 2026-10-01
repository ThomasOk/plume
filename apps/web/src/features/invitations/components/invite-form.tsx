import { zodResolver } from '@hookform/resolvers/zod';
import { createInvitationSchema } from '@repo/api/schemas';
import { Button } from '@repo/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { TRPCClientError } from '@trpc/client';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type z from 'zod';
import { useCreateInvitation } from '../hooks/use-create-invitation';

type InviteInput = z.input<typeof createInvitationSchema>;

interface InviteFormProps {
  spaceId: string;
}

export const InviteForm = ({ spaceId }: InviteFormProps) => {
  const createInvitation = useCreateInvitation();
  const form = useForm<InviteInput>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: { email: '', role: 'member' },
  });

  const onSubmit = async (values: InviteInput) => {
    try {
      const invitation = await createInvitation.mutateAsync({ spaceId, ...values });
      form.reset();
      toast.success(`Invitation sent to ${invitation.email}`);
    } catch (error) {
      // "Already a member" is about the address the admin typed: say it next to the field.
      if (error instanceof TRPCClientError && error.data?.code === 'CONFLICT') {
        form.setError('email', { message: error.message });
        return;
      }
      toast.error('Failed to send the invitation');
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <FormField
          name="email"
          control={form.control}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="colleague@example.com" autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="role"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Invite
        </Button>
      </form>
    </Form>
  );
};
