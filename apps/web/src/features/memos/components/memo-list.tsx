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
      {memos.map((memo) => (
        <MemoCard key={memo.id} memo={memo} />
      ))}
    </div>
  );
};
