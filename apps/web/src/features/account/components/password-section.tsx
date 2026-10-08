import { zodResolver } from '@hookform/resolvers/zod';
import { passwordSchema } from '@repo/auth/password';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
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
import { z } from 'zod';
import { useChangePassword } from '../hooks/use-change-password';
import { useLinkedAccounts } from '../hooks/use-linked-accounts';

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
    revokeOtherSessions: z.boolean(),
  })
  .refine((values) => values.confirmPassword === values.newPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

// The password a user signs in with lives in their `credential` account; a user who only
// signs in with Google has none, and nothing here applies to them.
export const PasswordSection = () => {
  const { data: accounts, isError } = useLinkedAccounts();

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Your password settings could not be loaded.
      </p>
    );
  }

  const hasPassword =
    accounts?.some((account) => account.providerId === 'credential') ?? false;

  if (!hasPassword) return null;

  return <PasswordForm />;
};

const PasswordForm = () => {
  const changePassword = useChangePassword();
  const form = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      revokeOtherSessions: false,
    },
  });

  const onSubmit = async ({
    currentPassword,
    newPassword,
    revokeOtherSessions,
  }: PasswordChangeInput) => {
    try {
      await changePassword.mutateAsync({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });
      form.reset();
      toast.success('Password changed');
    } catch (error) {
      // Shown in the form rather than a toast: "Invalid password" stays next to the field
      // the user has to fix.
      form.setError('root', { message: (error as Error).message });
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Password</h2>
        <p className="text-sm text-muted-foreground">
          Change the password you sign in with.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            name="currentPassword"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="current-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="newPassword"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="confirmPassword"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="revokeOtherSessions"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <FormLabel className="font-normal">
                  Sign out every other device
                </FormLabel>
              </FormItem>
            )}
          />
          {form.formState.errors.root && (
            <p role="alert" className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Change password
          </Button>
        </form>
      </Form>
    </section>
  );
};
