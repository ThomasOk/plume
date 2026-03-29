import { Input } from '@repo/ui/components/input';
import { sounds } from '@/lib/sounds';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';

export const SearchInput = () => {
  const search = useSearch({ strict: false });
  const queryFromUrl = (search as { query?: string }).query ?? '';
  const [value, setValue] = useState(queryFromUrl);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(queryFromUrl);
  }, [queryFromUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.click();
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, query: value.trim() || undefined }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <button
        type="button"
        aria-label="Focus search"
        onClick={() => inputRef.current?.focus()}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground"
      >
        <RiSearchLine className="size-4" />
      </button>
      <Input
        ref={inputRef}
        value={value}
        type="search"
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search memos..."
        spellCheck={false}
        className="pl-8 h-8 focus-visible:ring-0"
      />
      <button type="submit" className="sr-only">
        Search
      </button>
    </form>
  );
};
