import { useMemo } from 'react';
import { addDays, format } from 'date-fns';
import type {
  CalendarMatrixResult,
  CalendarDayCell,
  CalendarDayRow,
} from './types';
import { WEEKDAYS, DAYS_IN_WEEK } from './constants';
import {
  getCalendarStartDate,
  getCalendarDaysCount,
  isToday,
  isWeekend,
} from './utils';

export const useCalendar = (
  month: string,
  data: Record<string, number>,
  selectedDate?: string,
): CalendarMatrixResult => {
  return useMemo(() => {
    const totalDays = getCalendarDaysCount(month);
    const startDate = getCalendarStartDate(month);

    const allDays: CalendarDayCell[] = [];

    for (let i = 0; i < totalDays; i++) {
      const currentDate = addDays(startDate, i);
      const dateString = format(currentDate, 'yyyy-MM-dd');

      const cell: CalendarDayCell = {
        date: dateString,
        label: currentDate.getDate(),
        count: data[dateString] ?? 0,
        isCurrentMonth: dateString.startsWith(month),
        isToday: isToday(dateString),
        isSelected: dateString === selectedDate,
        isWeekend: isWeekend(dateString),
      };

      allDays.push(cell);
    }

    const weeks: CalendarDayRow[] = [];

    for (let i = 0; i < allDays.length; i += DAYS_IN_WEEK) {
      const weekDays = allDays.slice(i, i + DAYS_IN_WEEK);
      weeks.push({ days: weekDays });
    }

    const maxCount = Math.max(...Object.values(data), 0);

    return {
      weeks,
      weekDays: WEEKDAYS,
      maxCount,
    };
  }, [month, data, selectedDate]);
};
