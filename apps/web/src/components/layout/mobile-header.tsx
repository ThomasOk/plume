import { Button } from '@repo/ui/components/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@repo/ui/components/sheet';
import { GiFeather } from 'react-icons/gi';
import { RiMenuLine } from 'react-icons/ri';
import { SidebarNav } from './sidebar-nav';
import { SearchInput, TagList, useMemos } from '@/features/memos';
import { StatisticsView } from '@/features/memos/components/statistics-view';
import { authClient } from '@/lib/authClient';
import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';

export const MobileHeader = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { data: session } = authClient.useSession();
  const { data: memos } = useMemos({ enabled: !!session?.user });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="flex md:hidden justify-between items-center px-4 py-3 border-b">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" className="px-2 gap-2">
            <GiFeather className="w-6 h-6 shrink-0 text-primary" />
            <span className="font-bold text-lg text-foreground">Plume</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[320px] p-2">
          <SheetHeader>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
          </SheetHeader>
          <SidebarNav collapsed={false} />
        </SheetContent>
      </Sheet>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost">
            <RiMenuLine className="size-5 text-foreground" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[320px]">
          <SheetHeader>
            <SheetTitle className="sr-only">Filter</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-6 pt-2 px-6">
            <SearchInput />
            <StatisticsView />
            <TagList memos={memos || []} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};
