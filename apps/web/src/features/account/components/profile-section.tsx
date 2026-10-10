import { zodResolver } from '@hookform/resolvers/zod';
import { accountNameSchema } from '@repo/auth/account-name';
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
import { Label } from '@repo/ui/components/label';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useUpdateName } from '../hooks/use-update-name';
import { sounds } from '@/lib/sounds';

const profileSchema = z.object({ name: accountNameSchema });

type ProfileInput = z.infer<typeof profileSchema>;

interface ProfileSectionProps {
  name: string;
  email: string;
}

export const ProfileSection = ({ name, email }: ProfileSectionProps) => {
  const updateName = useUpdateName();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    values: { name },
  });

  const onSubmit = async (values: ProfileInput) => {
    try {
      await updateName.mutateAsync(values.name);
      toast.success('Name updated');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your name is shown on your memos and comments.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <Label htmlFor="account-email">Email</Label>
            <Input
              id="account-email"
              value={email}
              readOnly
              aria-describedby="account-email-description"
              className="text-muted-foreground"
            />
            <p
              id="account-email-description"
              className="text-sm text-muted-foreground"
            >
              Your email cannot be changed.
            </p>
          </div>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
            onClick={sounds.click}
          >
            Save
          </Button>
        </form>
      </Form>
    </section>
  );
};
