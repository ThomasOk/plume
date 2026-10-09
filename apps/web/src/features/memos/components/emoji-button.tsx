import { Button } from '@repo/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { Component, lazy, Suspense, useRef, useState, type ReactNode, type RefObject } from 'react';
import { MdOutlineEmojiEmotions } from 'react-icons/md';
import { sounds } from '@/lib/sounds';

// One import, shared by the early start on hover or focus and by the lazy component.
const loadEmojiPicker = () => import('./emoji-picker');
const EmojiPicker = lazy(() => loadEmojiPicker().then((module) => ({ default: module.EmojiPicker })));

// The picker's own size (see `emoji-picker.tsx`), repeated so the fallbacks do not import it
// and pull the picker into the initial bundle.
const PICKER_SIZE = 'h-80 w-80';

const PickerMessage = ({ children }: { children: ReactNode }) => (
  <div className={`${PICKER_SIZE} flex items-center justify-center text-sm text-muted-foreground`}>
    {children}
  </div>
);

/**
 * Keeps a picker that failed to load (a lost connection, a chunk gone with a new deploy)
 * inside its popover, rather than taking the editor and the writer's text down with it.
 */
class PickerErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <PickerMessage>The emoji picker could not load.</PickerMessage>
    ) : (
      this.props.children
    );
  }
}

interface EmojiButtonProps {
  editorRef: RefObject<HTMLTextAreaElement | null>;
  onInsert: (text: string, startIndex: number, length: number) => void;
}

/**
 * Opens an emoji picker whose picks go in at the editor's caret, as typing would. The picker
 * stays open for the next pick; closing it puts the writer back in the text, after the last
 * emoji inserted.
 */
export const EmojiButton = ({ editorRef, onInsert }: EmojiButtonProps) => {
  const [open, setOpen] = useState(false);
  // The picker holds the focus while open, so where the next emoji goes is kept here.
  const selection = useRef({ start: 0, end: 0 });

  const onOpenChange = (nextOpen: boolean) => {
    const editor = editorRef.current;
    if (nextOpen && editor) {
      selection.current = { start: editor.selectionStart, end: editor.selectionEnd };
    }
    setOpen(nextOpen);
  };

  const insert = (emoji: string) => {
    const { start, end } = selection.current;
    onInsert(emoji, start, end - start);
    const caret = start + emoji.length;
    selection.current = { start: caret, end: caret };
    editorRef.current?.setSelectionRange(caret, caret);
  };

  const returnToText = (event: Event) => {
    event.preventDefault();
    // After Radix has let go of the focus, which it does on a tick of its own.
    setTimeout(() => {
      const editor = editorRef.current;
      editor?.focus();
      editor?.setSelectionRange(selection.current.start, selection.current.end);
    });
  };

  return (
    // Modal, so a click outside closes the picker only: the page behind does not take it, and
    // in focus mode the backdrop does not close focus mode as well.
    <Popover open={open} onOpenChange={onOpenChange} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={sounds.click}
          onPointerEnter={loadEmojiPicker}
          onFocus={loadEmojiPicker}
          className="size-6 text-muted-foreground"
          aria-label="Insert emoji"
        >
          <MdOutlineEmojiEmotions className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Emoji picker"
        align="start"
        className="w-auto p-0"
        onCloseAutoFocus={returnToText}
        // Escape closes the picker only, not the focus mode around the editor.
        onEscapeKeyDown={(event) => event.stopPropagation()}
      >
        <PickerErrorBoundary>
          <Suspense fallback={<PickerMessage>Loading…</PickerMessage>}>
            <EmojiPicker onEmojiSelect={insert} />
          </Suspense>
        </PickerErrorBoundary>
      </PopoverContent>
    </Popover>
  );
};
