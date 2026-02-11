import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { MonthCalendar } from '@/components/calendar';
import { getMonthFirstDay } from '@/components/calendar/utils';
import { useMemosStats } from '../hooks';
import { useSearch } from '@tanstack/react-router';
import { useDateFilterNavigation } from '@/hooks/use-date-filter-navigation';
import { Button } from '@repo/ui/components/button';
import { MdOutlineChevronLeft, MdOutlineChevronRight } from 'react-icons/md';

export const StatisticsView = () => {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  const search = useSearch({ strict: false });
  const selectedDate = search.date as string | undefined;

  const navigateToDateFilter = useDateFilterNavigation();

  const { data: statsData } = useMemosStats();

  const handlePrevMonth = () => {
    setMonth(format(subMonths(getMonthFirstDay(month), 1), 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    setMonth(format(addMonths(getMonthFirstDay(month), 1), 'yyyy-MM'));
  };

  return (
    <div className="w-full max-w-[280px]">
      <div className="mb-4 flex items-center justify-between">
        <div>{format(getMonthFirstDay(month), 'MMMM yyyy')}</div>
        <div>
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <MdOutlineChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <MdOutlineChevronRight />
          </Button>
        </div>
      </div>
      <MonthCalendar
        month={month}
        selectedDate={selectedDate}
        data={statsData ?? {}}
        onClick={navigateToDateFilter}
      />
    </div>
  );
};
