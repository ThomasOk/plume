import { Fragment } from 'react';
import type { MonthCalendarProps } from './types';
import { CalendarCell } from './calendar-cell';
import { useCalendar } from './use-calendar';

export const MonthCalendar = ({
  data,
  selectedDate,
  month,
  onClick,
  className,
}: MonthCalendarProps) => {
  const { weeks, weekDays, maxCount } = useCalendar(month, data, selectedDate);
  return (
    <>
      <div className={className}>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className=" flex items-center justify-center text-xs font-medium"
            >
              {day}
            </div>
          ))}
          {weeks.map((week, weekIndex) => (
            <Fragment key={weekIndex}>
              {week.days.map((day) => (
                <CalendarCell
                  key={day.date}
                  cell={day}
                  maxCount={maxCount}
                  onClick={onClick}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
};
