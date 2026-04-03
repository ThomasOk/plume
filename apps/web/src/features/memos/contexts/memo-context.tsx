import { createContext, useContext } from 'react';
import type { Comment, Memo } from '@/lib/types';

interface MemoContextValue {
  memo: Memo | Comment;
}

export const MemoContext = createContext<MemoContextValue | null>(null);

export const useMemoContext = () => {
  const context = useContext(MemoContext);

  if (!context) {
    throw new Error('useMemoContext must be used within MemoContext.Provider');
  }

  return context;
};
