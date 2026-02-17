import { Badge } from '@repo/ui/components/badge';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { MdClose } from 'react-icons/md';
import { RiHashtag } from 'react-icons/ri';

export const TagFilterBadge = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const selectedTag = search.tag as string | undefined;

  const handleRemoveFilter = () => {
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, tag: undefined }),
    });
  };

  if (!selectedTag) return null;

  return (
    <div className="mb-2">
      <Badge
        variant="secondary"
        className="bg-gray-200 hover:bg-gray-300 text-sm rounded-2xl"
      >
        <RiHashtag className="!size-4 -mr-1" />
        {selectedTag}
        <button
          onClick={handleRemoveFilter}
          className="ml-1 cursor-pointer hover:bg-gray-400 rounded-full p-0.5 transition-colors"
        >
          <MdClose />
        </button>
      </Badge>
    </div>
  );
};
