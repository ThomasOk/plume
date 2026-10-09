import { useReactionMutation } from './use-reaction-mutation';
import { useTRPC } from '@/lib/api';

/** Takes back the reader's reaction on a memo, whatever it is. */
export const useUnreactToMemo = () => {
  const trpc = useTRPC();
  const { mutationFn } = trpc.memos.unreact.mutationOptions();

  return useReactionMutation(mutationFn!, () => null);
};
