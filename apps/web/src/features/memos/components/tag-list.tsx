import { cn } from '@repo/ui/lib/utils';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { Memo } from '@/lib/types';
import { RiHashtag } from 'react-icons/ri';

interface TagListProps {
  memos: Memo[];
}

export const TagList = ({ memos }: TagListProps) => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const selectedTag = search.tag;

  const handleClick = (tag: string) => {
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, tag }),
    });
  };

  const tagCounts = memos.reduce(
    (acc, memo) => {
      memo.tags.forEach((tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>,
  );

  const sortedTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({
      tag,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-2">Tags</h3>
      {sortedTags.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tags yet</p>
      ) : (
        <ul className="space-y-1">
          {sortedTags.map(({ tag, count }) => (
            <li key={tag} className="text-sm">
              <button
                onClick={() => handleClick(tag)}
                className={cn(
                  'flex items-center text-sm cursor-pointer hover:opacity-80 truncate',
                  tag === selectedTag && 'font-medium text-sky-800',
                )}
              >
                <RiHashtag className="!size-4" />
                {tag} ({count})
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
