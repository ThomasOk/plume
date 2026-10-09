import { Button } from '@repo/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { lazy, Suspense, useRef, useState, type RefObject } from 'react';
import { MdOutlineEmojiEmotions } from 'react-icons/md';
import { sounds } from '@/lib/sounds';

// One import, shared by the early start on hover or focus and by the lazy component.
const loadEmojiPicker = () => import('./emoji-picker');
const EmojiPicker = lazy(() => loadEmojiPicker().then((module) => ({ default: module.EmojiPicker })));

const PICKER_SIZE = 'h-80 w-80';

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
    // After the browser has placed the focus: a click outside may have landed on another
    // control, or in the text at a caret of its own, and that choice is the writer's.
    setTimeout(() => {
      const active = document.activeElement;
      if (active && active !== document.body) return;
      const editor = editorRef.current;
      editor?.focus();
      editor?.setSelectionRange(selection.current.start, selection.current.end);
    });
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
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
        <Suspense
          fallback={
            <div className={`${PICKER_SIZE} flex items-center justify-center text-sm text-muted-foreground`}>
              Loading…
            </div>
          }
        >
          <EmojiPicker onEmojiSelect={insert} />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
};
