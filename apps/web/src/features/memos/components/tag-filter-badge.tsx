import { Badge } from '@repo/ui/components/badge';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import { MdClose } from 'react-icons/md';
import { RiHashtag } from 'react-icons/ri';
import { sounds } from '@/lib/sounds';

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

  return (
    <AnimatePresence>
      {selectedTag && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.12, ease: [0.215, 0.61, 0.355, 1] }}
          className="mb-2"
        >
          <Badge
            variant="secondary"
            className="bg-secondary hover:bg-secondary/80 text-sm rounded-2xl"
          >
            <RiHashtag className="!size-4 -mr-1" />
            {selectedTag}
            <button
              onClick={() => { sounds.click(); handleRemoveFilter(); }}
              aria-label="Remove tag filter"
              className="ml-1 cursor-pointer hover:bg-accent rounded-full p-0.5 transition-colors"
            >
              <MdClose />
            </button>
          </Badge>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
