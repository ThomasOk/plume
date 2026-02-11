import { createFileRoute, Outlet } from '@tanstack/react-router';
import { StatisticsView } from '@/features/memos/components/statistics-view';

export const Route = createFileRoute('/(memos)')({
  component: MemosLayout,
});

function MemosLayout() {
  return (
    <div className="flex h-full">
      <aside className="w-[280px] border-r p-4">
        <StatisticsView />
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
