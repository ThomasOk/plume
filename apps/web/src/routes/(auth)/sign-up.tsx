import { createFileRoute } from '@tanstack/react-router';
import { SignUpCard } from '@/features/auth/components/sign-up-card';

export const Route = createFileRoute('/(auth)/sign-up')({
  component: RouteComponent,
});

function RouteComponent() {
  return <SignUpCard />;
}
