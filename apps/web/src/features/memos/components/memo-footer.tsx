import { MAX_MEMO_CHARACTERS } from '@repo/api/schemas';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import { VisibilitySelector } from './visibility-selector';

interface MemoFooterProps {
  charCount: number;
  isOverLimit: boolean;
  isPending: boolean;
  isValid: boolean;
  visibility: 'public' | 'private';
  onVisibilityChange: (value: 'public' | 'private') => void;
  onCancel?: () => void;
}

export const MemoFooter = ({
  charCount,
  isOverLimit,
  isPending,
  isValid,
  visibility,
  onVisibilityChange,
  onCancel,
}: MemoFooterProps) => {
  const remaining = MAX_MEMO_CHARACTERS - charCount;

  return (
    <div className="flex items-center justify-between gap-2 pt-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium tabular-nums transition-colors',
              isOverLimit
                ? 'text-destructive'
                : remaining < 1000
                  ? 'text-destructive/70'
                  : 'text-muted-foreground',
            )}
          >
            {charCount.toLocaleString()} / {MAX_MEMO_CHARACTERS.toLocaleString()}
          </span>
          {isOverLimit && (
            <span className="text-destructive text-xs font-medium">
              {Math.abs(remaining).toLocaleString()} characters over limit
            </span>
          )}
          {!isOverLimit && remaining < 1000 && remaining > 0 && (
            <span className="text-destructive/70 text-xs">
              {remaining.toLocaleString()} characters remaining
            </span>
          )}
        </div>
        {isOverLimit && (
          <p className="text-xs text-destructive">
            Please remove {Math.abs(remaining).toLocaleString()} characters to save
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <VisibilitySelector value={visibility} onChange={onVisibilityChange} />
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={!isValid || isPending || isOverLimit}
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
};
