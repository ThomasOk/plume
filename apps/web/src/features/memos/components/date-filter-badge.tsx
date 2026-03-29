import { Badge } from '@repo/ui/components/badge';
import { sounds } from '@/lib/sounds';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
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

  return (
    <AnimatePresence>
      {selectedDate && (
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
            <CiCalendar className="!size-4" />
            {selectedDate}
            <button
              onClick={() => { sounds.click(); handleRemoveFilter(); }}
              aria-label="Remove date filter"
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
