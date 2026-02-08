import { cn } from '@repo/ui/lib/utils';
import type { CalendarDayCell } from './types';

interface CalendarCellProps {
  cell: CalendarDayCell;
  maxCount: number;
  onClick?: (date: string) => void;
}
export const CalendarCell = ({
  cell,
  maxCount,
  onClick,
}: CalendarCellProps) => {
  const intensity = maxCount > 0 ? (cell.count / maxCount) * 100 : 0;

  return (
    <div
      className={cn(
        'relative',
        'aspect-square',
        'text-sm',

        'rounded-xl',
        'cursor-pointer',
        !cell.isCurrentMonth && 'cursor-default',
        'transition-colors',
        'flex items-center justify-center',
        cell.isToday && 'ring-2 ring-primary/30  font-semibold',
        cell.isSelected && 'ring-2 ring-primary  font-bold',
      )}
      onClick={() => onClick?.(cell.date)}
    >
      <div
        className={cn(
          'absolute',
          'bg-blue-500',
          'rounded-xl',
          !cell.isCurrentMonth && 'bg-transparent',
        )}
        style={{ inset: '1px', opacity: intensity / 100 }}
      />
      <div className={cn('relative', !cell.isCurrentMonth && 'opacity-40')}>
        {cell.label}
      </div>
    </div>
  );
};
