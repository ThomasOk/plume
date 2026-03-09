import { useEffect, useRef, useState } from 'react';
import getCaretCoordinates from 'textarea-caret';

interface UseSuggestionsOptions<T> {
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  triggerChar: string;
  items: T[];
  filterItems: (items: T[], query: string) => T[];
  onAutocomplete: (item: T, word: string, startIndex: number) => void;
}

export function useSuggestions<T>({
  editorRef,
  triggerChar,
  items,
  filterItems,
  onAutocomplete,
}: UseSuggestionsOptions<T>) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    height: number;
  } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedRef = useRef(0);
  selectedRef.current = selectedIndex;
  const positionRef = useRef(position);
  positionRef.current = position;

  const hide = () => setPosition(null);

  const getCurrentWord = (): [string, number] => {
    const editor = editorRef?.current;

    if (!editor) return ['', 0];

    const cursorPos = editor.selectionEnd;
    const before = editor.value.slice(0, cursorPos);
    const after = editor.value.slice(cursorPos);
    const wordBefore = before.match(/\S*$/)?.[0] ?? '';
    const wordAfter = after.match(/^\S*/)?.[0] ?? '';

    return [wordBefore + wordAfter, cursorPos - wordBefore.length];
  };

  const suggestionsRef: React.RefObject<T[]> = useRef([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const filterItemsRef = useRef(filterItems);
  filterItemsRef.current = filterItems;

  const handleAutocomplete = (item: T) => {
    const [word, startIndex] = getCurrentWord();
    onAutocomplete(item, word, startIndex);
    hide();
  };

  const handleInput = () => {
    const [word, startIndex] = getCurrentWord();

    if (word.startsWith(triggerChar)) {
      const editor = editorRef?.current;
      if (!editor) return;

      const query = word.slice(triggerChar.length);
      suggestionsRef.current = filterItemsRef.current(itemsRef.current, query);
      setSelectedIndex(0);

      const coords = getCaretCoordinates(editor, startIndex);
      const top = coords.top - editor.scrollTop;

      setPosition({ top, left: coords.left, height: coords.height });
    } else {
      hide();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!positionRef.current || suggestionsRef.current.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(
          (selectedRef.current + 1) % suggestionsRef.current.length,
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(
          (selectedRef.current - 1 + suggestionsRef.current.length) %
            suggestionsRef.current.length,
        );
        break;
      case 'Enter':
      case 'Tab': {
        event.preventDefault();
        event.stopImmediatePropagation();
        const item = suggestionsRef.current[selectedRef.current];
        if (!item) return;
        handleAutocomplete(item);
        break;
      }
      case 'Escape':
      case 'ArrowLeft':
      case 'ArrowRight':
        hide();
    }
  };

  useEffect(() => {
    const editor = editorRef?.current;
    if (!editor) return;

    editor.addEventListener('input', handleInput);
    editor.addEventListener('keydown', handleKeyDown);
    editor.addEventListener('click', hide);
    editor.addEventListener('blur', hide);

    return () => {
      editor.removeEventListener('input', handleInput);
      editor.removeEventListener('keydown', handleKeyDown);
      editor.removeEventListener('click', hide);
      editor.removeEventListener('blur', hide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    position,
    suggestions: suggestionsRef.current,
    selectedIndex,
    isVisible: position !== null && suggestionsRef.current.length > 0,
    handleItemSelect: handleAutocomplete,
  };
}
