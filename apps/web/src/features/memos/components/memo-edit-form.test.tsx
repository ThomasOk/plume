import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { Memo } from '@/lib/types';
import { EnterFocusModeButton, MemoEditForm, useMemoEditing } from './memo-edit-form';
import { renderWithRouter } from '@/tests/render-with-router';

vi.mock('../hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks')>()),
  useUpdateMemo: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('./tag-suggestions', () => ({ TagSuggestions: () => null }));
vi.mock('@/features/spaces/hooks/use-space', () => ({ useSpace: () => ({ data: undefined }) }));
vi.mock('@/features/attachments', () => ({
  AttachmentList: () => null,
  useDeleteAttachment: () => ({ mutate: vi.fn(), isPending: false }),
  useFileUpload: () => ({
    localFiles: [],
    fileInputRef: { current: null },
    triggerFileSelect: vi.fn(),
    handleFilesSelected: vi.fn(),
    removeLocalFile: vi.fn(),
    confirmAll: vi.fn(),
    clearAll: vi.fn(),
    isUploading: false,
  }),
}));

const comment = {
  id: 'comment-1',
  userId: 'alice',
  parentId: 'memo-1',
  content: 'Count me in',
  tags: [],
  visibility: 'public',
  spaceId: null,
  pinnedAt: null,
  featuredAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  attachments: [],
} as unknown as Memo;

// Composed as a compact comment would, with no memo card around it.
const Host = () => {
  const editing = useMemoEditing();
  return (
    <div>
      {editing.isEditing && <EnterFocusModeButton onClick={editing.enterFocusMode} />}
      <MemoEditForm memo={comment} editing={editing} />
      {!editing.isEditing && (
        <button type="button" onClick={editing.startEditing}>
          Edit
        </button>
      )}
    </div>
  );
};

describe('MemoEditForm, outside a memo card', () => {
  it('edits in focus mode and returns to the inline form on Escape, draft kept', async () => {
    await renderWithRouter(<Host />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.type(screen.getByRole('textbox'), ' too');
    await user.click(screen.getByRole('button', { name: 'Enter focus mode' }));

    expect(await screen.findByRole('button', { name: 'Exit focus mode' })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(2);

    await user.keyboard('{Escape}');

    await vi.waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Exit focus mode' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('textbox')).toHaveValue('Count me in too');
  });

  it('closes on cancel', async () => {
    await renderWithRouter(<Host />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});
