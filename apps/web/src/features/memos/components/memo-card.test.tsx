import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Memo } from '@/lib/types';
import { useMemoTags } from '../hooks';
import { MemoCard } from './memo-card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useSpace } from '@/features/spaces/hooks/use-space';
import { renderWithRouter } from '@/tests/render-with-router';

// The card is rendered outside any space's URL, as on a memo's own page: whatever it knows
// about the space, it knows from the memo.
vi.mock('../hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks')>()),
  useUpdateMemo: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteMemo: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMemoTags: vi.fn(),
}));
vi.mock('../hooks/use-move-memo', () => ({
  useMoveMemo: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/features/auth/hooks/use-auth');
vi.mock('@/features/spaces/hooks/use-space');
vi.mock('@/features/spaces/hooks/use-spaces', () => ({ useSpaces: () => ({ data: [] }) }));
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

const ALICE = 'alice';
const BOB = 'bob';

const spaceMemo = (authorId: string): Memo => ({
  id: 'memo-1',
  userId: authorId,
  parentId: null,
  content: 'Pasta night',
  tags: [],
  visibility: 'space',
  spaceId: 'club',
  createdAt: new Date(),
  updatedAt: new Date(),
  commentCount: 0,
  author: { name: 'Alice', image: null },
  attachments: [],
} as unknown as Memo);

const signedInAs = (userId: string, role: 'admin' | 'member') => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: userId } } as any);
  vi.mocked(useSpace).mockImplementation(
    (spaceId) =>
      ({ data: spaceId === 'club' ? { id: 'club', title: 'Cooking club', role } : undefined }) as any,
  );
};

const openActions = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Memo actions' }));
  await screen.findByRole('menuitem', { name: 'Open' });
  return user;
};

beforeEach(() => {
  vi.mocked(useMemoTags).mockImplementation(
    ({ scope }: any) =>
      ({ data: scope.kind === 'space' ? { 'club/menu': 3 } : { 'personal/diary': 5 } }) as any,
  );
});

describe('MemoCard, a memo of a space shown outside its space', () => {
  it('lets an admin delete another member’s memo, but not edit it', async () => {
    signedInAs(BOB, 'admin');
    await renderWithRouter(<MemoCard memo={spaceMemo(ALICE)} />);

    await openActions();

    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('offers a member no action on another member’s memo', async () => {
    signedInAs(BOB, 'member');
    await renderWithRouter(<MemoCard memo={spaceMemo(ALICE)} />);

    await openActions();

    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('names the space when its author edits it', async () => {
    signedInAs(ALICE, 'member');
    await renderWithRouter(<MemoCard memo={spaceMemo(ALICE)} />);

    const user = await openActions();
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

    expect(await screen.findByText('Cooking club')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Audience/ })).not.toBeInTheDocument();
  });

  it('suggests the space’s tags when editing, not the personal ones', async () => {
    signedInAs(ALICE, 'member');
    await renderWithRouter(<MemoCard memo={spaceMemo(ALICE)} />);

    const user = await openActions();
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    await user.type(await screen.findByRole('textbox'), ' #');

    expect(await screen.findByText('# club/menu')).toBeInTheDocument();
    expect(screen.queryByText('# personal/diary')).not.toBeInTheDocument();
  });
});
