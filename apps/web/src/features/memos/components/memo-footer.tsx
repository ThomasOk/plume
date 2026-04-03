import { MAX_MEMO_CHARACTERS } from '@repo/api/schemas';
import { Button } from '@repo/ui/components/button';
import { sounds } from '@/lib/sounds';
import { cn } from '@repo/ui/lib/utils';
import { useReducedMotion } from 'motion/react';
import { MdOutlineAttachFile } from 'react-icons/md';
import { VisibilitySelector } from './visibility-selector';

const SHOW_THRESHOLD = 0.7;
const WARN_THRESHOLD = MAX_MEMO_CHARACTERS - 1000;
const SIZE = 20;
const STROKE_WIDTH = 2;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CharacterIndicator = ({ charCount }: { charCount: number }) => {
  const prefersReducedMotion = useReducedMotion();
  const isOverLimit = charCount > MAX_MEMO_CHARACTERS;
  const isWarning = !isOverLimit && charCount >= WARN_THRESHOLD;
  const progress = Math.min(charCount / MAX_MEMO_CHARACTERS, 1);
  const isVisible = progress >= SHOW_THRESHOLD || isOverLimit;
  const showNumber = isOverLimit || isWarning;
  const remaining = MAX_MEMO_CHARACTERS - charCount;
  const offset = CIRCUMFERENCE * (1 - progress);

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 transition-opacity duration-200',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
      role={isVisible ? 'status' : undefined}
      aria-label={
        isVisible
          ? `${charCount} of ${MAX_MEMO_CHARACTERS} characters used`
          : undefined
      }
    >
      {/* Number — always in DOM to avoid layout shift, toggled via opacity */}
      <span
        className={cn(
          'text-xs tabular-nums transition-opacity duration-150',
          isOverLimit
            ? 'font-medium text-destructive'
            : 'text-muted-foreground',
          showNumber
            ? 'opacity-100'
            : 'pointer-events-none select-none opacity-0',
        )}
        aria-hidden={!showNumber}
      >
        {isOverLimit
          ? `-${Math.abs(remaining).toLocaleString()}`
          : remaining.toLocaleString()}
      </span>

      {/* Circular progress */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          className="stroke-muted-foreground/20"
        />
        {/* Progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          className={cn(
            isOverLimit
              ? 'stroke-destructive'
              : isWarning
                ? 'stroke-amber-500'
                : 'stroke-primary',
          )}
          style={{
            strokeDashoffset: offset,
            transition: prefersReducedMotion
              ? 'none'
              : 'stroke-dashoffset 150ms ease-out, stroke 150ms ease',
          }}
        />
      </svg>
    </div>
  );
};

interface MemoFooterProps {
  charCount: number;
  isOverLimit: boolean;
  isPending: boolean;
  isValid: boolean;
  isComment?: boolean;
  visibility: 'public' | 'private';
  onVisibilityChange: (value: 'public' | 'private') => void;
  onCancel?: () => void;
  onAttachFile?: () => void;
}

export const MemoFooter = ({
  charCount,
  isOverLimit,
  isPending,
  isValid,
  isComment = false,
  visibility,
  onVisibilityChange,
  onCancel,
  onAttachFile,
}: MemoFooterProps) => {
  return (
    <div className="flex items-center justify-between gap-2 pt-3">
      <div className="flex items-center gap-1">
        {onAttachFile && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => { sounds.click(); onAttachFile(); }}
            className="size-6 text-muted-foreground"
            aria-label="Attach file"
          >
            <MdOutlineAttachFile className="size-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <CharacterIndicator charCount={charCount} />
        {!isComment && <VisibilitySelector value={visibility} onChange={onVisibilityChange} />}
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
          onClick={sounds.click}
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
};
