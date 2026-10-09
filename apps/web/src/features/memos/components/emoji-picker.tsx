import { EmojiPicker as Picker } from 'frimousse';
import { env } from '@/env';

/**
 * Plume serves the emoji data itself (copied from `emojibase-data` by `vite.config.ts`), so
 * opening the picker makes no request to an outside domain and survives a CDN outage.
 */
const EMOJIBASE_URL = `${env.PUBLIC_BASE_PATH.replace(/\/$/, '')}/emojibase`;

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

/**
 * The full emoji picker: search, categories, arrow keys and Enter. Loaded on demand by the
 * emoji button, never part of the initial bundle.
 */
export const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => (
  <Picker.Root
    emojibaseUrl={EMOJIBASE_URL}
    onEmojiSelect={({ emoji }) => onEmojiSelect(emoji)}
    className="isolate flex h-80 w-80 flex-col"
  >
    <Picker.Search
      autoFocus
      aria-label="Search emojis"
      className="z-10 mx-2 mt-2 appearance-none rounded-md bg-muted px-2.5 py-2 text-base outline-hidden placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-sm"
    />
    <Picker.Viewport className="relative flex-1 outline-hidden">
      <Picker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </Picker.Loading>
      <Picker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
        No emoji found.
      </Picker.Empty>
      <Picker.List
        className="select-none pb-1.5"
        components={{
          CategoryHeader: ({ category, ...props }) => (
            <div className="bg-popover px-3 pt-3 pb-1.5 text-xs font-medium text-muted-foreground" {...props}>
              {category.label}
            </div>
          ),
          Row: ({ children, ...props }) => (
            <div className="scroll-my-1.5 px-1.5" {...props}>
              {children}
            </div>
          ),
          Emoji: ({ emoji, ...props }) => (
            <button
              className="flex size-8 items-center justify-center rounded-md text-lg data-[active]:bg-accent"
              {...props}
            >
              {emoji.emoji}
            </button>
          ),
        }}
      />
    </Picker.Viewport>
  </Picker.Root>
);
