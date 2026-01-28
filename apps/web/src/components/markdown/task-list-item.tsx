import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Memo } from '@/lib/types';
import type { InputHTMLAttributes } from 'react';
import { useMemoContext } from '@/features/memos/contexts/memo-context';
import { toggleTaskAtIndex } from '@/utils/markdown-manipulation';
import { useTRPC } from '@/lib/api';

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
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  // Get the correct queryKey from tRPC
  const queryKey = trpc.memos.listPublic.queryKey();

  // Create a local mutation with optimistic update callbacks
  const updateMemo = useMutation({
    mutationFn: trpc.memos.update.mutationOptions().mutationFn,

    // Optimistic update: update UI immediately before API call
    onMutate: async (variables: { id: string; content: string }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value for rollback
      const previousMemos = queryClient.getQueryData<Memo[]>(queryKey);

      // Optimistically update the cache
      if (previousMemos) {
        queryClient.setQueryData<Memo[]>(
          queryKey,
          previousMemos.map((m) =>
            m.id === variables.id
              ? { ...m, content: variables.content }
              : m,
          ),
        );
      }

      // Return context with the snapshot for rollback
      return { previousMemos };
    },

    // Rollback on error
    onError: (_err: unknown, _variables: unknown, context: unknown) => {
      // Type guard: check if context has previousMemos
      if (
        context &&
        typeof context === 'object' &&
        'previousMemos' in context &&
        context.previousMemos
      ) {
        queryClient.setQueryData(
          queryKey,
          context.previousMemos as Memo[],
        );
      }
      toast.error('Failed to update task. Please try again.');
    },

    // Always refetch after error or success to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
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

  return <input {...props} onChange={handleChange} disabled={false} />;
};
