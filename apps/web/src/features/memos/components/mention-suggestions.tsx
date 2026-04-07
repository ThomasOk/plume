import { useEffect, useState } from 'react';
import { useSuggestions } from '../hooks/use-suggestions';
import { useUserSearch } from '../hooks/use-user-search';
import { SuggestionsPopup } from './suggestions-popup';

interface MentionSuggestionsProps {
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsert: (text: string, startIndex: number, length: number) => void;
}

type UserResult = {
  id: string;
  name: string;
  username: string;
  image: string | null;
};

export const MentionSuggestions = ({
  editorRef,
  onInsert,
}: MentionSuggestionsProps) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: users = [] as UserResult[] } = useUserSearch(debouncedQuery);

  const { position, suggestions, selectedIndex, isVisible, handleItemSelect } =
    useSuggestions<UserResult>({
      editorRef,
      triggerChar: '@',
      items: users,
      // Server already filters — we just pass items through as-is
      filterItems: (items) => items,
      onAutocomplete: (item, word, startIndex) =>
        onInsert(`@${item.username} `, startIndex, word.length),
      onQueryChange: setQuery,
    });

  if (!isVisible) return null;

  return (
    <SuggestionsPopup
      position={position!}
      suggestions={suggestions}
      selectedIndex={selectedIndex}
      onItemSelect={handleItemSelect}
      renderItem={(item) => (
        <span className="flex items-center gap-2">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="size-6 rounded-full"
            />
          ) : (
            <span className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
              {item.name[0]?.toUpperCase()}
            </span>
          )}
          <span className="flex flex-col">
            <span className="font-medium">{item.name}</span>
            <span className="text-xs text-muted-foreground">
              @{item.username}
            </span>
          </span>
        </span>
      )}
      getItemKey={(item) => item.id}
    />
  );
};
