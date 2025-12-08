import { FcGoogle } from 'react-icons/fc';
import { DottedSeparator } from '@/components/ui/dotted-separator';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Input } from '@repo/ui/components/input';
import z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@repo/ui/components/form';
import { Link } from '@tanstack/react-router';
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
    <Card className="w-full h-full md:w-[487px] border-none shadow-none">
      <CardHeader className="flex items-center justify-center text-center p-7">
        <CardTitle className="text-2xl">Welcome Back!</CardTitle>
      </CardHeader>
      <div className="px-7 mb-2">
        <DottedSeparator />
      </div>
      <CardContent className="p-7">
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
              {form.formState.isSubmitting && (
                <Spinner className="mr-2 size-4" />
              )}
              Sign In
            </Button>
          </form>
        </Form>
      </CardContent>
      <div className="px-7">
        <DottedSeparator />
      </div>
      <CardContent className="p-7 flex flex-col gap-y-4">
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
        {/* <Button
          variant="secondary"
          disabled={false}
          size="lg"
          className="w-full"
        >
          Login with Github
        </Button> */}
      </CardContent>
      <div className="px-7">
        <DottedSeparator />
      </div>
      <CardContent className="p-7 flex items-center justify-center">
        <p>
          Don&apos;t have an account ?
          <Link to="/sign-up">
            <span className="text-blue-700">&nbsp; Sign Up</span>
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};
