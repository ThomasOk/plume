import { cn } from '@repo/ui/lib/utils';
import type { CalendarDayCell } from './types';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@repo/ui/components/tooltip';

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
  const isClickable = cell.isCurrentMonth && cell.count > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'relative',
            'aspect-square',
            'text-sm',

            'rounded-xl',
            isClickable ? 'cursor-pointer' : 'cursor-default',
            'transition-colors',
            'flex items-center justify-center',
            cell.isToday && 'ring-2 ring-primary/30  font-semibold',
            cell.isSelected && 'ring-2 ring-primary  font-bold',
          )}
          onClick={() => isClickable && onClick?.(cell.date)}
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
      </TooltipTrigger>
      {isClickable && (
        <TooltipContent>
          {cell.count} {cell.count === 1 ? 'memo' : 'memos'}
        </TooltipContent>
      )}
    </Tooltip>
  );
};
