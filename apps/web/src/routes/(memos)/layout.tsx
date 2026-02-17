import { createFileRoute, Outlet } from '@tanstack/react-router';
import { StatisticsView } from '@/features/memos/components/statistics-view';
import { authClient } from '@/lib/authClient';
import { TagList, useMemos } from '@/features/memos';

export const Route = createFileRoute('/(memos)')({
  component: MemosLayout,
});

function MemosLayout() {
  const { data: session } = authClient.useSession();
  const { data: memos } = useMemos({ enabled: !!session?.user });

  return (
    <div className="flex h-full">
      <aside className="w-[280px] border-r p-4">
        <StatisticsView />
        <TagList memos={memos || []} />
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
