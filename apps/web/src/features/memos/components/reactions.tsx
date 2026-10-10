import { REACTION_EMOJIS, type ReactionEmoji } from '@repo/api/schemas';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@repo/ui/components/tooltip';
import { cn } from '@repo/ui/lib/utils';
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  type ReactElement,
} from 'react';
import { MdOutlineAddReaction } from 'react-icons/md';
import type { ReactionSummary } from '@/lib/types';
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
  reactions: ReactionSummary[];
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
              'size-9 pointer-coarse:size-11 rounded-full text-xl leading-none transition-[background-color,transform] duration-150 ease-out hover:bg-accent active:scale-90 outline-none focus-visible:ring-1 focus-visible:ring-ring',
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
  reactions: ReactionSummary[];
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
      className="hit-area relative text-muted-foreground hover:text-foreground p-1 rounded outline-none focus-visible:ring-1 focus-visible:ring-ring opacity-0 transition-[opacity,color] duration-150 group-hover/memo:opacity-100 group-focus-within/memo:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
    >
      <MdOutlineAddReaction className="size-4" />
    </button>
  </ReactionPicker>
);

interface ReactionRowProps {
  memoId: string;
  reactions: ReactionSummary[];
  /** The signed-in reader, who may react, or null for an anonymous one, whom the pills only tell. */
  readerId: string | null;
}

/** How many reactors a pill's sentence names before it counts the rest. */
const NAMED_REACTORS = 4;

/** Who chose an emoji, the reader first as "You", so they find themselves without reading on. */
const reactorsReaderFirst = ({ reactors }: ReactionSummary, readerId: string | null) => [
  ...reactors.filter(({ id }) => id === readerId).map(({ id }) => ({ id, name: 'You' })),
  ...reactors.filter(({ id }) => id !== readerId),
];

/** "You, Alice and 3 others reacted with 👍": four names at most, then how many more. */
const whoReacted = (reaction: ReactionSummary, readerId: string | null) => {
  const named = reactorsReaderFirst(reaction, readerId)
    .slice(0, NAMED_REACTORS)
    .map(({ name }) => name);
  const others = reaction.count - named.length;
  const parts = others > 0 ? [...named, others === 1 ? '1 other' : `${others} others`] : named;
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return `${list} reacted with ${reaction.emoji}`;
};

/** How long a touch must rest on a pill to list its reactors rather than react. */
const LONG_PRESS_MS = 500;
/** How far a finger may drift during a long press before it counts as a drag, in pixels. */
const LONG_PRESS_SLOP = 10;

/**
 * A long press by touch, where there is no hover to show a tooltip. `isLongPress` tells the
 * click that ends a press whether it was one, so lifting the finger does not also react.
 */
const useLongPress = (onLongPress: () => void) => {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);
  const cancel = () => {
    clearTimeout(timer.current);
    start.current = null;
  };

  useEffect(() => cancel, []);

  return {
    handlers: {
      onPointerDown: (event: PointerEvent) => {
        longPressed.current = false;
        if (event.pointerType !== 'touch') return;
        start.current = { x: event.clientX, y: event.clientY };
        timer.current = setTimeout(() => {
          longPressed.current = true;
          onLongPress();
        }, LONG_PRESS_MS);
      },
      onPointerMove: (event: PointerEvent) => {
        if (!start.current) return;
        const drift = Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y);
        if (drift > LONG_PRESS_SLOP) cancel();
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      // The browser's own long-press menu would cover the list, and may come before it.
      onContextMenu: (event: MouseEvent) => {
        if (start.current || longPressed.current) event.preventDefault();
      },
    },
    isLongPress: () => longPressed.current,
  };
};

interface ReactionPillProps {
  memoId: string;
  reaction: ReactionSummary;
  readerId: string | null;
}

const pillClassName =
  'hit-area relative inline-flex items-center gap-1 h-7 px-2 rounded-full border text-sm tabular-nums select-none outline-none focus-visible:ring-1 focus-visible:ring-ring [-webkit-touch-callout:none] transition-[background-color,border-color,transform] duration-150 ease-out';

/**
 * One emoji and how many chose it. Hovering or focusing it names who did; on touch, a long
 * press lists them all while a tap keeps reacting. For an anonymous reader it only tells.
 */
const ReactionPill = ({ memoId, reaction, readerId }: ReactionPillProps) => {
  const { emoji, count, reactedByMe } = reaction;
  const setReaction = useSetReaction(memoId);
  const [listOpen, setListOpen] = useState(false);
  const longPress = useLongPress(() => setListOpen(true));
  const label = whoReacted(reaction, readerId);
  const pill = useRef<HTMLElement>(null);

  const content = (
    <>
      <span>{emoji}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </>
  );

  return (
    <Popover open={listOpen} onOpenChange={setListOpen}>
      <Tooltip>
        <PopoverAnchor asChild>
          <TooltipTrigger asChild>
            {readerId !== null ? (
              <button
                ref={pill as RefObject<HTMLButtonElement>}
                type="button"
                aria-label={label}
                aria-pressed={reactedByMe}
                {...longPress.handlers}
                onClick={(event) => {
                  if (longPress.isLongPress()) return;
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
                {content}
              </button>
            ) : (
              <span ref={pill} role="img" aria-label={label} tabIndex={0} {...longPress.handlers} className={pillClassName}>
                {content}
              </span>
            )}
          </TooltipTrigger>
        </PopoverAnchor>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent
        aria-label={`Reacted with ${emoji}`}
        // Lifting the finger that opened the list lands on the pill: that is no reason to close it.
        onInteractOutside={(event) => {
          if (pill.current?.contains(event.target as Node)) event.preventDefault();
        }}
        // Focus sent back to the pill would open its tooltip over the list just closed.
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-auto min-w-40 max-w-64 p-2"
      >
        <p className="px-1 pb-1 text-xs text-muted-foreground">Reacted with {emoji}</p>
        <ul className="max-h-60 overflow-y-auto text-sm">
          {reactorsReaderFirst(reaction, readerId).map(({ id, name }) => (
            <li key={id} className="px-1 py-0.5 truncate">
              {name}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};

/**
 * The reactions a memo received, one pill per emoji with how many chose it, under its body.
 * Nothing at all when it has none, so a memo nobody reacted to stays quiet.
 */
export const ReactionRow = ({ memoId, reactions, readerId }: ReactionRowProps) => {
  if (reactions.length === 0) return null;

  return (
    <TooltipProvider>
      {/* On touch, the wider gap keeps each pill's target apart from its neighbours'. */}
      <div role="group" aria-label="Reactions" className="flex flex-wrap items-center gap-1.5 pointer-coarse:gap-4 mt-3">
        {reactions.map((reaction) => (
          <ReactionPill key={reaction.emoji} memoId={memoId} reaction={reaction} readerId={readerId} />
        ))}
        {readerId !== null && (
          <ReactionPicker memoId={memoId} reactions={reactions}>
            <button
              type="button"
              aria-label="Add a reaction"
              className="hit-area relative inline-flex items-center justify-center size-7 rounded-full border text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring transition-[background-color,color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground active:scale-95"
            >
              <MdOutlineAddReaction className="size-4" />
            </button>
          </ReactionPicker>
        )}
      </div>
    </TooltipProvider>
  );
};
