import { useMemoScope, useMemoTags } from '../hooks';
import { useSuggestions } from '../hooks/use-suggestions';
import { SuggestionsPopup } from './suggestions-popup';
import type { MemoViewScope } from '../types';

interface TagSuggestionsProps {
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsert: (text: string, startIndex: number, length: number) => void;
  /** Defaults to the scope on screen. */
  scope?: MemoViewScope;
}

export const TagSuggestions = ({
  editorRef,
  onInsert,
  scope: memoScope,
}: TagSuggestionsProps) => {
  // Suggest the tags of the scope being written into.
  const scopeOnScreen = useMemoScope();
  const scope = memoScope ?? scopeOnScreen;
  const { data } = useMemoTags({ scope });
  const sortedTags = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1]);
  const { position, suggestions, selectedIndex, isVisible, handleItemSelect } =
    useSuggestions({
      editorRef,
      triggerChar: '#',
      items: sortedTags,
      filterItems: (items, query) =>
        items.filter((item) =>
          item[0].toLowerCase().includes(query.toLowerCase()),
        ),
      onAutocomplete: (item, word, startIndex) =>
        onInsert(`#${item[0]} `, startIndex, word.length),
    });

  if (!isVisible) return null;

  return (
    <SuggestionsPopup
      position={position!}
      suggestions={suggestions}
      selectedIndex={selectedIndex}
      onItemSelect={handleItemSelect}
      renderItem={(item, _isSelected) => `# ${item[0]}`}
      getItemKey={(item) => item[0]}
    />
  );
};
