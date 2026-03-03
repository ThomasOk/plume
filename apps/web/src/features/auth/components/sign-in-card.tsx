import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { FcGoogle } from 'react-icons/fc';
import { GiFeather } from 'react-icons/gi';
import z from 'zod';
import { useAuth } from '../hooks/use-auth';
import Spinner from '@/components/ui/spinner';

const formSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'Required'),
});

export const SignInCard = () => {
  const { signInWithGoogle, login, isGoogleLoading } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await login(values);
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-2">
        <GiFeather className="h-12 w-12 text-primary" />
        <h1 className="text-xl">Log in to your account</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            name="email"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="Enter email address"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="password"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Enter password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            size="lg"
            className="w-full"
          >
            {form.formState.isSubmitting && <Spinner className="mr-2 size-4" />}
            Sign In
          </Button>
        </form>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground text-sm">
            Or
          </span>
        </div>
      </div>

      <Button
        onClick={signInWithGoogle}
        variant="secondary"
        disabled={isGoogleLoading}
        size="lg"
        className="w-full"
      >
        {isGoogleLoading ? (
          <Spinner className="mr-2 size-5" />
        ) : (
          <FcGoogle className="mr-2 size-5" />
        )}
        Login with Google
      </Button>

      <div className="flex items-center justify-center">
        <p>
          Don&apos;t have an account ?
          <Link to="/sign-up">
            <span className="text-primary">&nbsp; Sign Up</span>
          </Link>
        </p>
      </div>
    </div>
  );
};
