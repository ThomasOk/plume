import { SignInCard } from '@/features/auth/components/sign-in-card';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(auth)/sign-in')({
  component: Login,
});

function Login() {
  return <SignInCard />;
}
