import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Memo } from '@/lib/types';
import type { InputHTMLAttributes } from 'react';
import { useMemoContext } from '@/features/memos/contexts/memo-context';
import { useTRPC } from '@/lib/api';
import { toggleTaskAtIndex } from '@/utils/markdown-manipulation';
import { authClient } from '@/lib/authClient';

const getTaskIndex = (checkbox: HTMLInputElement): number | null => {
  const listItem = checkbox.closest('li');
  if (!listItem) return null;

  const dataIndex = listItem.getAttribute('data-task-index');
  if (dataIndex !== null) {
    const index = parseInt(dataIndex, 10);
    if (!isNaN(index)) {
      return index;
    }
  }

  // Fallback method: count in the DOM
  // Find the root container (traverse up until we find contains-task-list)
  let searchRoot = listItem.parentElement;
  while (searchRoot && !searchRoot.classList.contains('contains-task-list')) {
    searchRoot = searchRoot.parentElement;
  }

  // If we didn't find the container, fallback to document.body
  if (!searchRoot) {
    searchRoot = document.body;
  }

  // Get all task list items
  const allTaskItems = searchRoot.querySelectorAll('li.task-list-item');

  // Find the position of our list item
  for (let i = 0; i < allTaskItems.length; i++) {
    if (allTaskItems[i] === listItem) {
      return i;
    }
  }

  return null;
};

export const TaskListItem = (props: InputHTMLAttributes<HTMLInputElement>) => {
  const { memo } = useMemoContext();
  const { data: session } = authClient.useSession();
  const isAuthor = session?.user?.id === memo.userId;
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  // Create a local mutation with optimistic update callbacks
  const updateMemo = useMutation({
    mutationFn: trpc.memos.update.mutationOptions().mutationFn,

    // Optimistic update: update UI immediately before API call
    onMutate: async (variables: { id: string; content: string }) => {
      // Get specific queryKeys with undefined input to match cached queries
      const listKey = trpc.memos.list.queryKey({ date: undefined });
      const listPublicKey = trpc.memos.listPublic.queryKey({ date: undefined });

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: listPublicKey });

      // Snapshot the previous values for rollback
      const previousList = queryClient.getQueryData<Memo[]>(listKey);
      const previousListPublic = queryClient.getQueryData<Memo[]>(listPublicKey);

      // Optimistically update list query
      if (previousList) {
        queryClient.setQueryData<Memo[]>(
          listKey,
          previousList.map((m) =>
            m.id === variables.id
              ? { ...m, content: variables.content }
              : m
          )
        );
      }

      // Optimistically update listPublic query
      if (previousListPublic) {
        queryClient.setQueryData<Memo[]>(
          listPublicKey,
          previousListPublic.map((m) =>
            m.id === variables.id
              ? { ...m, content: variables.content }
              : m
          )
        );
      }

      // Return context with snapshots for rollback
      return { previousList, previousListPublic };
    },

    // Rollback on error
    onError: (
      err: Error,
      _variables: { id: string; content: string },
      context?: { previousList?: Memo[]; previousListPublic?: Memo[] }
    ) => {
      if (context) {
        const listKey = trpc.memos.list.queryKey({ date: undefined });
        const listPublicKey = trpc.memos.listPublic.queryKey({ date: undefined });

        // Restore previous state
        if (context.previousList) {
          queryClient.setQueryData<Memo[]>(listKey, context.previousList);
        }
        if (context.previousListPublic) {
          queryClient.setQueryData<Memo[]>(listPublicKey, context.previousListPublic);
        }
      }
      toast.error(err.message || 'Failed to update task. Please try again.');
    },

    // Always refetch after error or success to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['memos']] });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = e.target.checked;

    // 1. Find the index of this task
    const taskIndex = getTaskIndex(e.target);

    // 2. Verify that we found a valid index
    if (taskIndex === null) {
      console.error('Could not find task index');
      return;
    }

    // 3. Modify the markdown with our utility
    const newContent = toggleTaskAtIndex(memo.content, taskIndex, newChecked);

    // 4. Save via the mutation with optimistic update
    updateMemo.mutate({
      id: memo.id,
      content: newContent,
    });
  };

  return (
    <input
      {...props}
      onChange={handleChange}
      disabled={!isAuthor}
      className={!isAuthor ? 'opacity-50 cursor-not-allowed' : ''}
    />
  );
};
