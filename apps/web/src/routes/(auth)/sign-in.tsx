import { createFileRoute } from '@tanstack/react-router';
import { SignInCard } from '@/features/auth/components/sign-in-card';

export const Route = createFileRoute('/(auth)/sign-in')({
  component: Login,
});

function Login() {
  return <SignInCard />;
}
