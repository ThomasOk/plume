import { REACTION_EMOJIS, type ReactionEmoji } from '@repo/api/schemas';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { cn } from '@repo/ui/lib/utils';
import { useState, type ReactElement } from 'react';
import { MdOutlineAddReaction } from 'react-icons/md';
import type { Reaction } from '@/lib/types';
import { useReactToMemo, useUnreactToMemo } from '../hooks';

/**
 * Sets the reader's reaction on a memo to `emoji`, or takes it back with `null`. Each call
 * names the state it wants, so a quick second click cannot cancel the first in flight.
 */
const useSetReaction = (memoId: string) => {
  const react = useReactToMemo();
  const unreact = useUnreactToMemo();

  return (emoji: ReactionEmoji | null) =>
    emoji === null ? unreact.mutate({ memoId }) : react.mutate({ memoId, emoji });
};

interface ReactionPickerProps {
  memoId: string;
  reactions: Reaction[];
  /** The control that opens the picker. */
  children: ReactElement;
}

/**
 * The seven emojis, the reader's current one pressed. Picking another reacts with it,
 * picking the current one takes it back, and either closes the picker: reacting is two clicks.
 */
const ReactionPicker = ({ memoId, reactions, children }: ReactionPickerProps) => {
  const [open, setOpen] = useState(false);
  const setReaction = useSetReaction(memoId);
  const current = reactions.find(({ reactedByMe }) => reactedByMe)?.emoji ?? null;

  const pick = (emoji: ReactionEmoji) => {
    setReaction(emoji === current ? null : emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent aria-label="Pick a reaction" align="end" className="w-auto p-1 flex gap-0.5 rounded-full">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-pressed={emoji === current}
            onClick={() => pick(emoji)}
            className={cn(
              'size-9 rounded-full text-xl leading-none transition-[background-color,transform] duration-150 ease-out hover:bg-accent active:scale-90',
              emoji === current && 'bg-primary/15 hover:bg-primary/25',
            )}
          >
            {emoji}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

interface ReactButtonProps {
  memoId: string;
  reactions: Reaction[];
}

/**
 * The react button of a memo's header, for a signed-in reader. On a pointer device it stays
 * out of sight until the memo is hovered or holds the focus, so a list stays calm; it stays
 * while its picker is open. On touch, where there is no hover to make, it always shows.
 */
export const ReactButton = ({ memoId, reactions }: ReactButtonProps) => (
  <ReactionPicker memoId={memoId} reactions={reactions}>
    <button
      type="button"
      aria-label="React"
      className="text-muted-foreground hover:text-foreground p-1 rounded opacity-0 transition-[opacity,color] duration-150 group-hover/memo:opacity-100 group-focus-within/memo:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
    >
      <MdOutlineAddReaction className="size-4" />
    </button>
  </ReactionPicker>
);

interface ReactionRowProps {
  memoId: string;
  reactions: Reaction[];
  /** Whether the reader may react: signed in. Otherwise the pills only tell. */
  canReact: boolean;
}

const pillClassName =
  'inline-flex items-center gap-1 h-7 px-2 rounded-full border text-sm tabular-nums transition-[background-color,border-color,transform] duration-150 ease-out';

/**
 * The reactions a memo received, one pill per emoji with how many chose it, under its body.
 * Nothing at all when it has none, so a memo nobody reacted to stays quiet.
 */
export const ReactionRow = ({ memoId, reactions, canReact }: ReactionRowProps) => {
  const setReaction = useSetReaction(memoId);

  if (reactions.length === 0) return null;

  return (
    <div role="group" aria-label="Reactions" className="flex flex-wrap items-center gap-1.5 mt-3">
      {reactions.map(({ emoji, count, reactedByMe }) =>
        canReact ? (
          <button
            key={emoji}
            type="button"
            aria-label={`${emoji} ${count}`}
            aria-pressed={reactedByMe}
            onClick={(event) => {
              // The second click of a double click would take back what the first set: a
              // stutter should leave the reaction meant, not none.
              if (event.detail > 1) return;
              setReaction(reactedByMe ? null : emoji);
            }}
            className={cn(
              pillClassName,
              'hover:bg-accent active:scale-95',
              reactedByMe && 'border-primary/50 bg-primary/10 hover:bg-primary/20',
            )}
          >
            <span>{emoji}</span>
            <span className="text-xs text-muted-foreground">{count}</span>
          </button>
        ) : (
          <span key={emoji} className={pillClassName}>
            <span>{emoji}</span>
            <span className="text-xs text-muted-foreground">{count}</span>
          </span>
        ),
      )}
      {canReact && (
        <ReactionPicker memoId={memoId} reactions={reactions}>
          <button
            type="button"
            aria-label="Add a reaction"
            className="inline-flex items-center justify-center size-7 rounded-full border text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground active:scale-95"
          >
            <MdOutlineAddReaction className="size-4" />
          </button>
        </ReactionPicker>
      )}
    </div>
  );
};
