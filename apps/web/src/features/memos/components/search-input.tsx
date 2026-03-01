import { Input } from '@repo/ui/components/input';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';

export const SearchInput = () => {
  const search = useSearch({ strict: false });
  const queryFromUrl = (search as { query?: string }).query ?? '';
  const [value, setValue] = useState(queryFromUrl);
  const navigate = useNavigate();

  useEffect(() => {
    setValue(queryFromUrl);
  }, [queryFromUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, query: value.trim() || undefined }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        value={value}
        type="search"
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search memos..."
        className="pl-8 h-8"
      />
      <button type="submit" className="sr-only">
        Search
      </button>
    </form>
  );
};
