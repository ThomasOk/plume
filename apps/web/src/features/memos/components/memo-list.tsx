import { AnimatePresence, motion } from 'motion/react';
import type { Memo } from '@/lib/types';
import { MemoCard } from './memo-card';

interface MemoListProps {
  memos: Memo[];
}

export const MemoList = ({ memos }: MemoListProps) => {
  if (memos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          No memos yet. Start creating one!
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false} mode="popLayout">
        {memos.map((memo) => (
          <motion.div
            key={memo.id}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
          >
            <MemoCard memo={memo} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
