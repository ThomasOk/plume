import {
  parseISO,
  isToday as isTodayDateFns,
  isWeekend as isWeekendDateFns,
  startOfWeek,
  endOfWeek,
  endOfMonth,
  differenceInDays,
} from 'date-fns';

export const isToday = (date: string): boolean => {
  return isTodayDateFns(parseISO(date));
};

export const isWeekend = (date: string): boolean => {
  return isWeekendDateFns(parseISO(date));
};

export const getMonthFirstDay = (month: string): Date => {
  return parseISO(`${month}-01`); // "2026-01" → "2026-01-01"
};

export const getCalendarStartDate = (month: string): Date => {
  return startOfWeek(getMonthFirstDay(month), { weekStartsOn: 1 });
};

export const getMonthLastDay = (month: string): Date => {
  return endOfMonth(getMonthFirstDay(month));
};

export const getCalendarEndDate = (month: string): Date => {
  return endOfWeek(getMonthLastDay(month), { weekStartsOn: 1 });
};

export const getCalendarDaysCount = (month: string): number => {
  return (
    differenceInDays(getCalendarEndDate(month), getCalendarStartDate(month)) + 1
  );
};
