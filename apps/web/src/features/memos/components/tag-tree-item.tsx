import { cn } from '@repo/ui/lib/utils';
import { sounds } from '@/lib/sounds';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { MdChevronRight } from 'react-icons/md';
import { RiHashtag } from 'react-icons/ri';
import type { TagNode } from '../types';

export const TagTreeItem = ({ node }: { node: TagNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const selectedTag = search.tag;
  const shouldReduceMotion = useReducedMotion();

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
          onClick={() => { sounds.click(); handleClick(node.fullPath); }}
          className={cn(
            'flex items-center text-sm font-medium cursor-pointer hover:opacity-80 truncate',
            node.fullPath === selectedTag ? 'text-primary' : 'text-foreground',
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
            onClick={() => { sounds.pop(); setIsOpen(!isOpen); }}
            aria-label={isOpen ? 'Collapse tag' : 'Expand tag'}
            className="ml-1 cursor-pointer hover:opacity-80"
          >
            <MdChevronRight
              className={cn(
                'transition-transform duration-150 ease-out',
                isOpen && 'rotate-90',
              )}
            />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {node.children.length > 0 && isOpen && (
          <motion.ul
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={shouldReduceMotion ? {} : { height: 0, opacity: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.15, ease: [0.215, 0.61, 0.355, 1] }
            }
            className="ml-2 border-l-2 pl-2 space-y-1 my-1 overflow-hidden"
          >
            {node.children.map((child) => (
              <TagTreeItem key={child.fullPath} node={child} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
};
