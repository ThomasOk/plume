import { Badge } from '@repo/ui/components/badge';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { CiCalendar } from 'react-icons/ci';
import { MdClose } from 'react-icons/md';

export const DateFilterBadge = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const selectedDate = search.date as string | undefined;

  const handleRemoveFilter = () => {
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, date: undefined }),
    });
  };

  if (!selectedDate) return null;

  return (
    <div className="mb-2">
      <Badge
        variant="secondary"
        className="bg-gray-200 hover:bg-gray-300 text-sm rounded-2xl"
      >
        <CiCalendar className="!size-4" />
        {selectedDate}
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
