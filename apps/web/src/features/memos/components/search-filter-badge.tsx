import { Badge } from '@repo/ui/components/badge';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
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

  return (
    <AnimatePresence>
      {query && (
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
            <RiSearchLine className="!size-4" />
            {query}
            <button
              onClick={handleRemoveFilter}
              aria-label="Remove search filter"
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
