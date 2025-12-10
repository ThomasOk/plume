import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTRPC } from '@/lib/api';

export const Route = createFileRoute('/debug')({
  component: DebugPage,
});

function DebugPage() {
  const [content, setContent] = useState('');
  const [selectedMemoId, setSelectedMemoId] = useState('');

  // Récupère le client tRPC
  const trpc = useTRPC();

  // Queries
  const {
    data: memos,
    isLoading,
    refetch,
  } = useQuery({
    ...trpc.memos.list.queryOptions(),
    // Ne pas refetch automatiquement pour voir les changements manuellement
    refetchOnWindowFocus: false,
  });

  // Mutations
  const createMemoOptions = trpc.memos.create.mutationOptions();
  const createMemo = useMutation({
    mutationFn: createMemoOptions.mutationFn,
    onSuccess: () => {
      console.log('✅ Memo created successfully');
      setContent('');
      refetch();
    },
    onError: (error: Error) => {
      console.error('❌ Error creating memo:', error);
    },
  });

  const updateMemoOptions = trpc.memos.update.mutationOptions();
  const updateMemo = useMutation({
    mutationFn: updateMemoOptions.mutationFn,
    onSuccess: () => {
      console.log('✅ Memo updated successfully');
      setContent('');
      setSelectedMemoId('');
      refetch();
    },
    onError: (error: Error) => {
      console.error('❌ Error updating memo:', error);
    },
  });

  const deleteMemoOptions = trpc.memos.delete.mutationOptions();
  const deleteMemo = useMutation({
    mutationFn: deleteMemoOptions.mutationFn,
    onSuccess: () => {
      console.log('✅ Memo deleted successfully');
      refetch();
    },
    onError: (error: Error) => {
      console.error('❌ Error deleting memo:', error);
    },
  });

  // Handlers
  const handleCreate = () => {
    if (!content.trim()) {
      alert('Content cannot be empty');
      return;
    }
    createMemo.mutate({ content });
  };

  const handleUpdate = () => {
    if (!selectedMemoId) {
      alert('Please select a memo to update');
      return;
    }
    if (!content.trim()) {
      alert('Content cannot be empty');
      return;
    }
    updateMemo.mutate({ id: selectedMemoId, content });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this memo?')) {
      deleteMemo.mutate({ id });
    }
  };

  const handleEdit = (id: string, currentContent: string) => {
    setSelectedMemoId(id);
    setContent(currentContent);
  };

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold mb-8">🧪 Debug Page - Test tRPC API</h1>

      {/* Form Section */}
      <div className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">
          {selectedMemoId ? '📝 Update Memo' : '✨ Create Memo'}
        </h2>
        <textarea
          className="w-full p-3 border rounded-md mb-4 min-h-[100px]"
          placeholder="Enter memo content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex gap-2">
          {selectedMemoId ? (
            <>
              <button
                onClick={handleUpdate}
                disabled={updateMemo.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMemo.isPending ? 'Updating...' : 'Update Memo'}
              </button>
              <button
                onClick={() => {
                  setSelectedMemoId('');
                  setContent('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleCreate}
              disabled={createMemo.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {createMemo.isPending ? 'Creating...' : 'Create Memo'}
            </button>
          )}
        </div>
      </div>

      {/* Memos List */}
      <div className="p-6 border rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">📋 Memos List</h2>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Refresh
          </button>
        </div>

        {isLoading && <p className="text-gray-500">Loading memos...</p>}

        {!isLoading && (!memos || memos.length === 0) && (
          <p className="text-gray-500 italic">No memos yet. Create one to get started!</p>
        )}

        {memos && memos.length > 0 && (
          <div className="space-y-4">
            {memos.map((memo) => (
              <div key={memo.id} className="p-4 bg-gray-50 rounded-md border">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">ID: {memo.id}</p>
                    <p className="whitespace-pre-wrap">{memo.content}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <button
                    onClick={() => handleEdit(memo.id, memo.content)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(memo.id)}
                    disabled={deleteMemo.isPending}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <span className="ml-auto text-xs text-gray-500">
                    Created: {new Date(memo.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-100 rounded-md">
        <h3 className="font-semibold mb-2">📊 Debug Info</h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(
            {
              totalMemos: memos?.length || 0,
              isLoading,
              createPending: createMemo.isPending,
              updatePending: updateMemo.isPending,
              deletePending: deleteMemo.isPending,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
