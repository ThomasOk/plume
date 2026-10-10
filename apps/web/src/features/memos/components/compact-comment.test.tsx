import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Comment } from '@/lib/types';
import { CompactComment } from './compact-comment';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useSpace } from '@/features/spaces/hooks/use-space';
import { renderWithRouter } from '@/tests/render-with-router';

const { react, unreact } = vi.hoisted(() => ({ react: vi.fn(), unreact: vi.fn() }));

vi.mock('../hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks')>()),
  useUpdateMemo: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteMemo: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteComment: () => ({ mutate: vi.fn(), isPending: false }),
  usePinMemo: () => ({ mutate: vi.fn(), isPending: false }),
  useUnpinMemo: () => ({ mutate: vi.fn(), isPending: false }),
  useFeatureMemo: () => ({ mutate: vi.fn(), isPending: false }),
  useUnfeatureMemo: () => ({ mutate: vi.fn(), isPending: false }),
  useReactToMemo: () => ({ mutate: react, isPending: false }),
  useUnreactToMemo: () => ({ mutate: unreact, isPending: false }),
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
  reactions = [],
}: { visibility?: 'space' | 'public' | 'private'; reactions?: unknown[] } = {}): Comment =>
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
    reactions,
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
  await user.click(screen.getByRole('button', { name: 'Comment actions' }));
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

    expect(screen.queryByRole('button', { name: 'Comment actions' })).not.toBeInTheDocument();
  });

  it('offers another member nothing', async () => {
    signedInAs(ALICE);
    await renderWithRouter(<CompactComment comment={bobsComment()} />);

    expect(screen.queryByRole('button', { name: 'Comment actions' })).not.toBeInTheDocument();
  });

  it('offers an anonymous reader nothing', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);
    vi.mocked(useSpace).mockReturnValue({ data: undefined } as any);
    await renderWithRouter(<CompactComment comment={bobsComment({ visibility: 'public' })} />);

    expect(screen.queryByRole('button', { name: 'Comment actions' })).not.toBeInTheDocument();
  });
});

describe('CompactComment, reacting to a comment', () => {
  const thumbsUpByBobAndMe = {
    emoji: '👍',
    count: 2,
    reactedByMe: true,
    reactors: [{ id: ALICE, name: 'Alice' }, { id: BOB, name: 'Bob' }],
  };
  const partyByBob = { emoji: '🎉', count: 1, reactedByMe: false, reactors: [{ id: BOB, name: 'Bob' }] };

  const reactionRow = () => screen.queryByRole('group', { name: 'Reactions' });

  beforeEach(() => {
    react.mockClear();
    unreact.mockClear();
  });

  it('shows no row on a comment nobody reacted to', async () => {
    signedInAs(ALICE);
    await renderWithRouter(<CompactComment comment={bobsComment()} />);

    expect(reactionRow()).not.toBeInTheDocument();
  });

  it('shows one pill per emoji under the text, takes back the reader’s own and moves to another', async () => {
    signedInAs(ALICE);
    await renderWithRouter(<CompactComment comment={bobsComment({ reactions: [thumbsUpByBobAndMe, partyByBob] })} />);
    const user = userEvent.setup();

    const row = within(reactionRow()!);
    expect(row.getByRole('button', { name: 'You and Bob reacted with 👍' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(row.getByRole('button', { name: 'You and Bob reacted with 👍' }));
    expect(unreact).toHaveBeenCalledWith({ memoId: 'c-1' });

    await user.click(row.getByRole('button', { name: 'Bob reacted with 🎉' }));
    expect(react).toHaveBeenCalledWith({ memoId: 'c-1', emoji: '🎉' });
  });

  it('reacts from the header’s button, the picker closing on the pick', async () => {
    signedInAs(ALICE);
    await renderWithRouter(<CompactComment comment={bobsComment()} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'React' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '💡' }));

    expect(react).toHaveBeenCalledWith({ memoId: 'c-1', emoji: '💡' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an anonymous reader the pills, not as buttons, and offers no way to react', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);
    vi.mocked(useSpace).mockReturnValue({ data: undefined } as any);
    await renderWithRouter(
      <CompactComment comment={bobsComment({ visibility: 'public', reactions: [thumbsUpByBobAndMe] })} />,
    );

    const row = within(reactionRow()!);
    expect(row.getByText('👍')).toBeInTheDocument();
    expect(row.queryAllByRole('button')).toEqual([]);
    expect(screen.queryByRole('button', { name: 'React' })).not.toBeInTheDocument();
  });
});
