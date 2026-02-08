import { createFileRoute } from '@tanstack/react-router';
import { MemoList, useMemos } from '@/features/memos';
import { MemoForm } from '@/features/memos/components/memo-form';
import { authClient } from '@/lib/authClient';

export const Route = createFileRoute('/(memos)/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const {
    data: memos,
    isLoading,
    error,
  } = useMemos({
    enabled: !!session?.user,
  });
  //const { data: memos, isLoading, error } = usePublicMemos();

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Memos</h1>
        <p className="text-muted-foreground mt-1">
          {session?.user
            ? `Welcome, ${session.user.name}! Here are your memos.`
            : 'Sign in to see your memos.'}
        </p>
      </div>
      <MemoForm />
      {isLoading && <p className="text-muted-foreground">Loading memos...</p>}
      {error && (
        <p className="text-red-500">
          Error loading memos:
          {error.message}
        </p>
      )}
      {memos && <MemoList memos={memos} />}
    </div>
  );
}
