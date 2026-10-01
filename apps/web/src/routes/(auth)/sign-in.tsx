import { createFileRoute } from '@tanstack/react-router';
import { SignInCard } from '@/features/auth/components/sign-in-card';
import { parseRedirectSearch } from '@/lib/schemas/redirect';

export const Route = createFileRoute('/(auth)/sign-in')({
  validateSearch: parseRedirectSearch,
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  return <SignInCard redirect={redirect} />;
}
