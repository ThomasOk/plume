export interface CalendarDayCell {
  date: string; // ISO format: "2026-01-29"
  label: number; // Day number: 1-31
  count: number; // Number of memos on this day
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isWeekend: boolean;
}

export interface CalendarDayRow {
  days: CalendarDayCell[];
}

export interface CalendarMatrixResult {
  weeks: CalendarDayRow[];
  weekDays: string[];
  maxCount: number;
}

export interface MonthCalendarProps {
  month: string; // Format: "YYYY-MM"
  selectedDate?: string;
  data: Record<string, number>; // { "2026-01-29": 3, ... }
  onClick?: (date: string) => void;
  className?: string;
}
