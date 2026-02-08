import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { MonthCalendar } from '@/components/calendar';
import { getMonthFirstDay } from '@/components/calendar/utils';
import { useMemosStats } from '../hooks';

export const StatisticsView = () => {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDate, setSelectedDate] = useState<string | undefined>(
    undefined,
  );
  const { data: statsData } = useMemosStats();

  const handlePrevMonth = () => {
    setMonth(format(subMonths(getMonthFirstDay(month), 1), 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    setMonth(format(addMonths(getMonthFirstDay(month), 1), 'yyyy-MM'));
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };

  return (
    <div className="w-full max-w-[280px]">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={handlePrevMonth}>◀</button>
        <div>{format(getMonthFirstDay(month), 'MMMM yyyy')}</div>
        <button onClick={handleNextMonth}>▶</button>
      </div>
      <MonthCalendar
        month={month}
        selectedDate={selectedDate}
        data={statsData ?? {}}
        onClick={handleDateClick}
      />
    </div>
  );
};
