import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/tooltip';
import { cn } from '@repo/ui/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

/** When a memo was written, relative to now, and the exact date on hover. */
export const RelativeDate = ({ date, className }: { date: Date; className?: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <time
          dateTime={date.toISOString()}
          className={cn('text-xs text-muted-foreground', className)}
        >
          {formatDistanceToNow(date, { addSuffix: true })}
        </time>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{format(date, 'PPpp')}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
