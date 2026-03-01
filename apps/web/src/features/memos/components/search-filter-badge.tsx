import { Badge } from '@repo/ui/components/badge';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { MdClose } from 'react-icons/md';
import { RiSearchLine } from 'react-icons/ri';

export const SearchFilterBadge = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const query = search.query as string | undefined;

  const handleRemoveFilter = () => {
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, query: undefined }),
    });
  };

  if (!query) return null;

  return (
    <div className="mb-2">
      <Badge
        variant="secondary"
        className="bg-secondary hover:bg-secondary/80 text-sm rounded-2xl"
      >
        <RiSearchLine className="!size-4" />
        {query}
        <button
          onClick={handleRemoveFilter}
          className="ml-1 cursor-pointer hover:bg-accent rounded-full p-0.5 transition-colors"
        >
          <MdClose />
        </button>
      </Badge>
    </div>
  );
};
