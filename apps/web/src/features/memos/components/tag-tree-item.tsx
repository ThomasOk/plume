import { cn } from '@repo/ui/lib/utils';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { RiHashtag } from 'react-icons/ri';
import type { TagNode } from '../types';
import { useState } from 'react';
import { MdExpandMore, MdChevronRight } from 'react-icons/md';

export const TagTreeItem = ({ node }: { node: TagNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const selectedTag = search.tag;

  const handleClick = (tagPath: string) => {
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, tag: tagPath }),
    });
  };

  return (
    <li>
      <div className="flex items-center justify-between w-full">
        <button
          onClick={() => handleClick(node.fullPath)}
          className={cn(
            'flex items-center text-sm cursor-pointer hover:opacity-80 truncate',
            node.fullPath === selectedTag && 'font-medium text-sky-800',
          )}
        >
          <RiHashtag className="!size-4" />
          {node.name}
          {node.count > 0 && (
            <span className="ml-1 text-muted-foreground">({node.count})</span>
          )}
        </button>
        {node.children.length > 0 && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="ml-1 cursor-pointer hover:opacity-80"
          >
            {isOpen ? <MdExpandMore /> : <MdChevronRight />}
          </button>
        )}
      </div>
      {node.children.length > 0 && isOpen && (
        <ul className="ml-2 border-l-2 pl-2 space-y-1 my-1">
          {node.children.map((child) => (
            <TagTreeItem key={child.fullPath} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
};
