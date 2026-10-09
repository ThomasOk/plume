import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Comment } from '@/lib/types';
import { CompactComment } from './compact-comment';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useSpace } from '@/features/spaces/hooks/use-space';
import { renderWithRouter } from '@/tests/render-with-router';

vi.mock('../hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks')>()),
  useUpdateMemo: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteMemo: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteComment: () => ({ mutate: vi.fn(), isPending: false }),
  usePinMemo: () => ({ mutate: vi.fn(), isPending: false }),
  useUnpinMemo: () => ({ mutate: vi.fn(), isPending: false }),
  useFeatureMemo: () => ({ mutate: vi.fn(), isPending: false }),
  useUnfeatureMemo: () => ({ mutate: vi.fn(), isPending: false }),
  useMemoTags: () => ({ data: [] }),
}));
vi.mock('@/features/auth/hooks/use-auth');
vi.mock('@/features/spaces/hooks/use-space');
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

// Bob's comment on a memo, carrying its memo's visibility and space as a comment does.
const bobsComment = ({
  visibility = 'space',
}: { visibility?: 'space' | 'public' | 'private' } = {}): Comment =>
  ({
    id: 'c-1',
    userId: BOB,
    parentId: 'memo-1',
    content: 'I bring the wine',
    tags: [],
    visibility,
    spaceId: visibility === 'space' ? 'club' : null,
    pinnedAt: null,
    featuredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { name: 'Bob', image: null },
    attachments: [],
  }) as unknown as Comment;

const signedInAs = (
  userId: string,
  { role = 'member', isOperator = false }: { role?: 'admin' | 'member'; isOperator?: boolean } = {},
) => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: userId, isOperator } } as any);
  vi.mocked(useSpace).mockImplementation(
    (spaceId) => ({ data: spaceId === 'club' ? { id: 'club', role } : undefined }) as any,
  );
};

const openActions = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Memo actions' }));
  await screen.findByRole('menuitem', { name: 'Delete' });
};

describe('CompactComment', () => {
  it('carries its id as anchor', async () => {
    signedInAs(ALICE);
    await renderWithRouter(<CompactComment comment={bobsComment()} />);

    expect(screen.getByText('I bring the wine').closest('#c-1')).not.toBeNull();
  });

  it('shows who wrote it and when', async () => {
    signedInAs(ALICE);
    await renderWithRouter(<CompactComment comment={bobsComment()} />);

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('less than a minute ago')).toBeInTheDocument();
  });

  it('lets its author edit and delete it', async () => {
    signedInAs(BOB);
    await renderWithRouter(<CompactComment comment={bobsComment()} />);

    await openActions();

    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('opens the edit form from Edit', async () => {
    signedInAs(BOB);
    await renderWithRouter(<CompactComment comment={bobsComment()} />);

    await openActions();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));

    expect(await screen.findByRole('textbox')).toHaveValue('I bring the wine');
  });

  it('lets a space admin delete a member’s comment, not edit it', async () => {
    signedInAs(ALICE, { role: 'admin' });
    await renderWithRouter(<CompactComment comment={bobsComment()} />);

    await openActions();

    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('lets an operator delete a comment on a public memo, not edit it', async () => {
    signedInAs(ALICE, { isOperator: true });
    await renderWithRouter(<CompactComment comment={bobsComment({ visibility: 'public' })} />);

    await openActions();

    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('offers an operator nothing on a comment on a memo that is not public', async () => {
    signedInAs(ALICE, { isOperator: true });
    await renderWithRouter(<CompactComment comment={bobsComment({ visibility: 'private' })} />);

    expect(screen.queryByRole('button', { name: 'Memo actions' })).not.toBeInTheDocument();
  });

  it('offers another member nothing', async () => {
    signedInAs(ALICE);
    await renderWithRouter(<CompactComment comment={bobsComment()} />);

    expect(screen.queryByRole('button', { name: 'Memo actions' })).not.toBeInTheDocument();
  });

  it('offers an anonymous reader nothing', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);
    vi.mocked(useSpace).mockReturnValue({ data: undefined } as any);
    await renderWithRouter(<CompactComment comment={bobsComment({ visibility: 'public' })} />);

    expect(screen.queryByRole('button', { name: 'Memo actions' })).not.toBeInTheDocument();
  });
});
