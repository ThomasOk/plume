import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { InputHTMLAttributes } from 'react';
import { restoreCachedReads, rewriteCachedMemo } from '@/features/memos/cached-memo';
import { useMemoContext } from '@/features/memos/contexts/memo-context';
import { useTRPC } from '@/lib/api';
import { authClient } from '@/lib/authClient';
import { toggleTaskAtIndex } from '@/utils/markdown-manipulation';

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

  // The ticked task shows at once wherever the memo is read (a list, whole or in pages, or
  // its own page), is put back if the server refuses, and is refetched either way.
  const updateMemo = useMutation({
    mutationFn: trpc.memos.update.mutationOptions().mutationFn,
    onMutate: async (variables: { id: string; content: string }) => ({
      touched: await rewriteCachedMemo(queryClient, trpc.memos.pathKey(), variables.id, (cached) => ({
        ...cached,
        content: variables.content,
      })),
    }),
    onError: (err: Error, _variables, context) => {
      restoreCachedReads(queryClient, context?.touched ?? []);
      toast.error(err.message || 'Failed to update task. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: trpc.memos.pathKey() });
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
