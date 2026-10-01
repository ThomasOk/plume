import { createFileRoute } from '@tanstack/react-router';
import { SignUpCard } from '@/features/auth/components/sign-up-card';
import { parseRedirectSearch } from '@/lib/schemas/redirect';

export const Route = createFileRoute('/(auth)/sign-up')({
  validateSearch: parseRedirectSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const { redirect } = Route.useSearch();
  return <SignUpCard redirect={redirect} />;
}
