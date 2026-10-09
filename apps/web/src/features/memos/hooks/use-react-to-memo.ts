import { useReactionMutation } from './use-reaction-mutation';
import { useTRPC } from '@/lib/api';

/** Sets the reader's reaction on a memo, replacing any other. */
export const useReactToMemo = () => {
  const trpc = useTRPC();
  const { mutationFn } = trpc.memos.react.mutationOptions();

  return useReactionMutation(mutationFn!, ({ emoji }) => emoji);
};
