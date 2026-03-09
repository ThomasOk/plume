import { cn } from '@repo/ui/lib/utils';
import { useEffect, useRef, type ReactNode } from 'react';

interface SuggestionsPopupProps<T> {
  position: { top: number; left: number; height: number };
  suggestions: T[];
  selectedIndex: number;
  onItemSelect: (item: T) => void;
  renderItem: (item: T, isSelected: boolean) => ReactNode;
  getItemKey: (item: T, index: number) => string;
}

export function SuggestionsPopup<T>({
  position,
  suggestions,
  selectedIndex,
  onItemSelect,
  renderItem,
  getItemKey,
}: SuggestionsPopupProps<T>) {
  const selectedItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [selectedIndex]);

  return (
    <div
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top + position.height,
      }}
      className="z-20 p-1 mt-1 max-w-48 max-h-60 rounded border bg-popover text-popover-foreground shadow-lg flex flex-col overflow-y-scroll overflow-x-hidden"
    >
      {suggestions.map((item, i) => (
        <div
          key={getItemKey(item, i)}
          onMouseDown={() => onItemSelect(item)}
          ref={i === selectedIndex ? selectedItemRef : null}
          className={cn(
            'rounded p-1 px-2 text-sm cursor-pointer select-none hover:bg-accent hover:text-accent-foreground',
            i === selectedIndex && 'bg-accent text-accent-foreground',
          )}
        >
          {renderItem(item, i === selectedIndex)}
        </div>
      ))}
    </div>
  );
}
