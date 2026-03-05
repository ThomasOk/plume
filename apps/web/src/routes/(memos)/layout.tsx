import { createFileRoute, Outlet } from '@tanstack/react-router';
import { SearchInput, TagList, useSidebarTags } from '@/features/memos';
import { StatisticsView } from '@/features/memos/components/statistics-view';

export const Route = createFileRoute('/(memos)')({
  component: MemosLayout,
});

function MemosLayout() {
  const { data, isLoading } = useSidebarTags();

  return (
    <div className="flex h-full">
      <aside className="hidden md:flex flex-col gap-4 w-[280px] border-r p-4">
        <SearchInput />
        <StatisticsView />
        <TagList tagCounts={data ?? {}} isLoading={isLoading} />
      </aside>
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
