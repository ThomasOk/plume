import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Memo } from '@/lib/types';
import { useLatestComments, useMemoTags } from '../hooks';
import { MemoCard } from './memo-card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useSpace } from '@/features/spaces/hooks/use-space';
import { renderWithRouter } from '@/tests/render-with-router';

const { pin, unpin, feature, unfeature, react, unreact } = vi.hoisted(() => ({
  pin: vi.fn(),
  unpin: vi.fn(),
  feature: vi.fn(),
  unfeature: vi.fn(),
  react: vi.fn(),
  unreact: vi.fn(),
}));

// The card is rendered outside any space's URL, as on a memo's own page: whatever it knows
// about the space, it knows from the memo.
vi.mock('../hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks')>()),
  useUpdateMemo: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteMemo: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePinMemo: () => ({ mutate: pin, isPending: false }),
  useUnpinMemo: () => ({ mutate: unpin, isPending: false }),
  useFeatureMemo: () => ({ mutate: feature, isPending: false }),
  useUnfeatureMemo: () => ({ mutate: unfeature, isPending: false }),
  useReactToMemo: () => ({ mutate: react, isPending: false }),
  useUnreactToMemo: () => ({ mutate: unreact, isPending: false }),
  useMemoTags: vi.fn(),
  useLatestComments: vi.fn(),
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

const spaceMemo = (authorId: string, pinnedAt: Date | null = null): Memo => ({
  id: 'memo-1',
  userId: authorId,
  parentId: null,
  content: 'Pasta night',
  tags: [],
  visibility: 'space',
  spaceId: 'club',
  pinnedAt,
  createdAt: new Date(),
  updatedAt: new Date(),
  commentCount: 0,
  author: { name: 'Alice', image: null },
  attachments: [],
  reactions: [],
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

describe('MemoCard, pinning a memo of a space', () => {
  it('lets an admin pin another member’s memo, naming only the memo', async () => {
    signedInAs(BOB, 'admin');
    await renderWithRouter(<MemoCard memo={spaceMemo(ALICE)} />);

    const user = await openActions();
    await user.click(screen.getByRole('menuitem', { name: 'Pin' }));

    expect(pin).toHaveBeenCalledWith({ id: 'memo-1' }, expect.anything());
  });

  it('offers a member no pin, on their own memo too', async () => {
    signedInAs(ALICE, 'member');
    await renderWithRouter(<MemoCard memo={spaceMemo(ALICE, new Date())} />);

    await openActions();

    expect(screen.queryByRole('menuitem', { name: 'Pin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Unpin' })).not.toBeInTheDocument();
  });

  it('marks a pinned memo, and offers an admin to unpin it', async () => {
    signedInAs(BOB, 'admin');
    await renderWithRouter(<MemoCard memo={spaceMemo(ALICE, new Date())} />);

    expect(screen.getByRole('img', { name: 'Pinned' })).toBeInTheDocument();
    const user = await openActions();
    await user.click(screen.getByRole('menuitem', { name: 'Unpin' }));

    expect(unpin).toHaveBeenCalledWith({ id: 'memo-1' }, expect.anything());
  });

  it('leaves pins out, mark and action alike, where they are ignored', async () => {
    signedInAs(BOB, 'admin');
    await renderWithRouter(<MemoCard memo={spaceMemo(ALICE, new Date())} ignorePins />);

    expect(screen.queryByRole('img', { name: 'Pinned' })).not.toBeInTheDocument();
    await openActions();
    expect(screen.queryByRole('menuitem', { name: 'Unpin' })).not.toBeInTheDocument();
  });
});

const publicMemo = ({ featuredAt = null, visibility = 'public' }: { featuredAt?: Date | null; visibility?: 'public' | 'private' } = {}): Memo => ({
  id: 'memo-1',
  userId: ALICE,
  parentId: null,
  content: 'Welcome to Plume',
  tags: [],
  visibility,
  spaceId: null,
  pinnedAt: null,
  featuredAt,
  createdAt: new Date(),
  updatedAt: new Date(),
  commentCount: 0,
  author: { name: 'Alice', image: null },
  attachments: [],
  reactions: [],
} as unknown as Memo);

const signedIn = ({ isOperator }: { isOperator: boolean }) => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: BOB, isOperator } } as any);
  vi.mocked(useSpace).mockReturnValue({ data: undefined } as any);
};

describe('MemoCard, featuring a memo on Explore', () => {
  it('lets an operator feature another user’s public memo, naming only the memo', async () => {
    signedIn({ isOperator: true });
    await renderWithRouter(<MemoCard memo={publicMemo()} />);

    const user = await openActions();
    await user.click(screen.getByRole('menuitem', { name: 'Feature' }));

    expect(feature).toHaveBeenCalledWith({ id: 'memo-1' }, expect.anything());
  });

  it('offers an operator to unfeature a featured memo', async () => {
    signedIn({ isOperator: true });
    await renderWithRouter(<MemoCard memo={publicMemo({ featuredAt: new Date() })} />);

    const user = await openActions();
    await user.click(screen.getByRole('menuitem', { name: 'Unfeature' }));

    expect(unfeature).toHaveBeenCalledWith({ id: 'memo-1' }, expect.anything());
  });

  it('offers anyone else neither', async () => {
    signedIn({ isOperator: false });
    await renderWithRouter(<MemoCard memo={publicMemo({ featuredAt: new Date() })} />);

    await openActions();

    expect(screen.queryByRole('menuitem', { name: 'Feature' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Unfeature' })).not.toBeInTheDocument();
  });

  it('offers an operator nothing on a memo that is not public', async () => {
    signedIn({ isOperator: true });
    await renderWithRouter(<MemoCard memo={publicMemo({ visibility: 'private' })} />);

    await openActions();

    expect(screen.queryByRole('menuitem', { name: 'Feature' })).not.toBeInTheDocument();
  });

  it('offers an operator nothing on a comment, which does not stand on its own on Explore', async () => {
    signedIn({ isOperator: true });
    const comment = { ...publicMemo(), parentId: 'parent-1', userId: BOB } as unknown as Memo;
    await renderWithRouter(<MemoCard memo={comment} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Comment actions' }));
    await screen.findByRole('menuitem', { name: 'Delete' });

    expect(screen.queryByRole('menuitem', { name: 'Feature' })).not.toBeInTheDocument();
  });

  it('marks a featured memo where Explore’s rules apply', async () => {
    signedIn({ isOperator: false });
    await renderWithRouter(<MemoCard memo={publicMemo({ featuredAt: new Date() })} markFeatured />);

    expect(screen.getByRole('img', { name: 'Featured' })).toBeInTheDocument();
  });

  it('leaves the mark out of a scope’s list, where featuring decides nothing', async () => {
    signedIn({ isOperator: false });
    await renderWithRouter(<MemoCard memo={publicMemo({ featuredAt: new Date() })} />);

    expect(screen.queryByRole('img', { name: 'Featured' })).not.toBeInTheDocument();
  });
});

describe('MemoCard, an operator deleting a public memo', () => {
  it('offers an operator Delete on another user’s public memo', async () => {
    signedIn({ isOperator: true });
    await renderWithRouter(<MemoCard memo={publicMemo()} />);

    await openActions();

    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('offers an operator Delete on another user’s comment on a public memo', async () => {
    signedIn({ isOperator: true });
    await renderWithRouter(<MemoCard memo={{ ...publicMemo(), parentId: 'parent-1' } as unknown as Memo} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Comment actions' }));

    // A comment has no Open item to wait for, as the featuring tests' comment case does.
    expect(await screen.findByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('offers an operator no Delete on another user’s memo that is not public', async () => {
    signedIn({ isOperator: true });
    await renderWithRouter(<MemoCard memo={publicMemo({ visibility: 'private' })} />);

    await openActions();

    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('offers anyone else no Delete on another user’s public memo', async () => {
    signedIn({ isOperator: false });
    await renderWithRouter(<MemoCard memo={publicMemo()} />);

    await openActions();

    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
  });
});

// The strip hangs under a commented memo in every list; it asks for its comments only once
// the card nears the viewport, so a long list does not load the comments of every memo.
describe('MemoCard, the strip of its latest comments', () => {
  let nearViewport: () => void;

  beforeEach(() => {
    signedIn({ isOperator: false });
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          nearViewport = () =>
            callback([{ isIntersecting: true } as IntersectionObserverEntry], this as any);
        }
        observe() {}
        disconnect() {}
      },
    );
    // Comments come back only once asked for, as the query does when it is enabled.
    vi.mocked(useLatestComments).mockImplementation(
      (_memoId, { enabled }) => ({ data: enabled ? latestComments : undefined }) as any,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const comment = (id: string, name: string, content: string) => ({
    id,
    parentId: 'memo-1',
    content,
    createdAt: new Date(),
    author: { name, image: null },
  });

  const latestComments = [
    comment('c-2', 'Bob', 'I bring **the wine**'),
    comment('c-3', 'Carol', 'Count me in'),
    comment('c-4', 'Dan', 'See [the menu](https://example.com)'),
  ];

  const commented = (commentCount: number) => ({ ...publicMemo(), commentCount }) as unknown as Memo;

  it('is absent under a memo without comments', async () => {
    await renderWithRouter(<MemoCard memo={commented(0)} />);

    expect(screen.queryByRole('region', { name: /^Comments/ })).not.toBeInTheDocument();
  });

  it('shows the total count, and leads to the comment section', async () => {
    await renderWithRouter(<MemoCard memo={commented(5)} />);

    const strip = screen.getByRole('region', { name: /^Comments/ });
    expect(within(strip).getByText('5')).toBeInTheDocument();
    expect(within(strip).getByRole('link', { name: /View all/ })).toHaveAttribute(
      'href',
      '/memos/memo-1#comments',
    );
  });

  it('asks for its comments only once the card nears the viewport', async () => {
    await renderWithRouter(<MemoCard memo={commented(5)} />);

    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    act(() => nearViewport());

    expect(useLatestComments).toHaveBeenLastCalledWith('memo-1', { enabled: true });
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('holds the room of the lines it will show before its comments arrive, so nothing jumps', async () => {
    await renderWithRouter(<MemoCard memo={commented(5)} />);
    expect(screen.getAllByTestId('comment-placeholder')).toHaveLength(3);

    act(() => nearViewport());
    expect(screen.queryByTestId('comment-placeholder')).not.toBeInTheDocument();
  });

  it('holds no more room than the memo has comments', async () => {
    await renderWithRouter(<MemoCard memo={commented(2)} />);

    expect(screen.getAllByTestId('comment-placeholder')).toHaveLength(2);
  });

  it('shows the latest comments, each leading to its own anchor on the memo’s page', async () => {
    await renderWithRouter(<MemoCard memo={commented(5)} />);
    act(() => nearViewport());

    const rows = within(screen.getByRole('region', { name: /^Comments/ })).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByRole('link')).toHaveAttribute('href', '/memos/memo-1#c-2');
    expect(within(rows[2]!).getByRole('link')).toHaveAttribute('href', '/memos/memo-1#c-4');
  });

  it('shows each comment’s text without its Markdown', async () => {
    await renderWithRouter(<MemoCard memo={commented(5)} />);
    act(() => nearViewport());

    expect(screen.getByText('I bring the wine')).toBeInTheDocument();
    expect(screen.getByText('See the menu')).toBeInTheDocument();
  });
});

describe('MemoCard, reacting to a memo', () => {
  const reacted = (reactions: unknown[]): Memo =>
    ({ ...publicMemo(), reactions }) as unknown as Memo;

  const thumbsUpByAliceAndMe = {
    emoji: '👍',
    count: 2,
    reactedByMe: true,
    reactors: [{ id: ALICE, name: 'Alice' }, { id: BOB, name: 'Bob' }],
  };
  const partyByAlice = { emoji: '🎉', count: 1, reactedByMe: false, reactors: [{ id: ALICE, name: 'Alice' }] };

  const people = (...names: string[]) => names.map((name) => ({ id: name.toLowerCase(), name }));

  const reactionRow = () => screen.queryByRole('group', { name: 'Reactions' });

  beforeEach(() => {
    react.mockClear();
    unreact.mockClear();
  });

  it('shows no row on a memo nobody reacted to', async () => {
    signedIn({ isOperator: false });
    await renderWithRouter(<MemoCard memo={reacted([])} />);

    expect(reactionRow()).not.toBeInTheDocument();
  });

  it('shows one pill per emoji with its count, the reader’s own pressed', async () => {
    signedIn({ isOperator: false });
    await renderWithRouter(<MemoCard memo={reacted([thumbsUpByAliceAndMe, partyByAlice])} />);

    const row = within(reactionRow()!);
    expect(row.getByRole('button', { name: 'You and Alice reacted with 👍' })).toHaveAttribute('aria-pressed', 'true');
    expect(row.getByRole('button', { name: 'Alice reacted with 🎉' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('takes the reaction back on the reader’s own pill, and moves it on another', async () => {
    signedIn({ isOperator: false });
    await renderWithRouter(<MemoCard memo={reacted([thumbsUpByAliceAndMe, partyByAlice])} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'You and Alice reacted with 👍' }));
    expect(unreact).toHaveBeenCalledWith({ memoId: 'memo-1' });

    await user.click(screen.getByRole('button', { name: 'Alice reacted with 🎉' }));
    expect(react).toHaveBeenCalledWith({ memoId: 'memo-1', emoji: '🎉' });
  });

  it('offers the seven emojis in order from the add control, the current one pressed', async () => {
    signedIn({ isOperator: false });
    await renderWithRouter(<MemoCard memo={reacted([thumbsUpByAliceAndMe])} />);
    const user = userEvent.setup();

    await user.click(within(reactionRow()!).getByRole('button', { name: 'Add a reaction' }));

    const picker = within(await screen.findByRole('dialog'));
    const emojis = picker.getAllByRole('button');
    expect(emojis.map((button) => button.textContent)).toEqual(['👍', '❤️', '😂', '🎉', '💡', '🙏', '😢']);
    expect(emojis.filter((button) => button.getAttribute('aria-pressed') === 'true').map((b) => b.textContent)).toEqual(['👍']);
  });

  it('reacts from the header’s button, the picker closing on the pick', async () => {
    signedIn({ isOperator: false });
    await renderWithRouter(<MemoCard memo={reacted([])} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'React' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '💡' }));

    expect(react).toHaveBeenCalledWith({ memoId: 'memo-1', emoji: '💡' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('takes the reaction back when the reader picks their current emoji', async () => {
    signedIn({ isOperator: false });
    await renderWithRouter(<MemoCard memo={reacted([thumbsUpByAliceAndMe])} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'React' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '👍' }));

    expect(unreact).toHaveBeenCalledWith({ memoId: 'memo-1' });
    expect(react).not.toHaveBeenCalled();
  });

  it('names the reader first, as “You”, and four reactors at most', async () => {
    signedIn({ isOperator: false });
    const reactors = [...people('Alice', 'Carol', 'Dan', 'Erin', 'Frank'), { id: BOB, name: 'Bob' }];
    await renderWithRouter(<MemoCard memo={reacted([{ emoji: '👍', count: 6, reactedByMe: true, reactors }])} />);

    expect(screen.getByRole('button', { name: 'You, Alice, Carol, Dan and 2 others reacted with 👍' })).toBeInTheDocument();
  });

  it('names only others when the reader did not react, and counts the rest past four', async () => {
    signedIn({ isOperator: false });
    await renderWithRouter(
      <MemoCard
        memo={reacted([
          { emoji: '❤️', count: 5, reactedByMe: false, reactors: people('Alice', 'Carol', 'Dan', 'Erin', 'Frank') },
          { emoji: '🎉', count: 4, reactedByMe: false, reactors: people('Alice', 'Carol', 'Dan', 'Erin') },
        ])}
      />,
    );

    expect(screen.getByRole('button', { name: 'Alice, Carol, Dan, Erin and 1 other reacted with ❤️' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alice, Carol, Dan and Erin reacted with 🎉' })).toBeInTheDocument();
  });

  it('names who reacted when a pill is hovered or focused', async () => {
    signedIn({ isOperator: false });
    await renderWithRouter(<MemoCard memo={reacted([thumbsUpByAliceAndMe, partyByAlice])} />);
    const user = userEvent.setup();

    await user.hover(screen.getByRole('button', { name: 'You and Alice reacted with 👍' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('You and Alice reacted with 👍');
    await user.unhover(screen.getByRole('button', { name: 'You and Alice reacted with 👍' }));

    act(() => screen.getByRole('button', { name: 'Alice reacted with 🎉' }).focus());
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Alice reacted with 🎉');
  });

  it('lists everyone who reacted on a long press by touch, while a tap still reacts', async () => {
    signedIn({ isOperator: false });
    const reactors = people('Alice', 'Carol', 'Dan', 'Erin', 'Frank');
    await renderWithRouter(<MemoCard memo={reacted([{ emoji: '❤️', count: 5, reactedByMe: false, reactors }])} />);
    const user = userEvent.setup();
    const pill = screen.getByRole('button', { name: /reacted with ❤️/ });

    await user.pointer({ keys: '[TouchA>]', target: pill });
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
    await user.pointer({ keys: '[/TouchA]', target: pill });

    const list = within(await screen.findByRole('dialog', { name: 'Reacted with ❤️' }));
    expect(list.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Alice',
      'Carol',
      'Dan',
      'Erin',
      'Frank',
    ]);
    expect(react).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    await user.pointer({ keys: '[TouchA]', target: pill });
    expect(react).toHaveBeenCalledWith({ memoId: 'memo-1', emoji: '❤️' });
  });

  it('tells an anonymous reader who reacted', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);
    await renderWithRouter(<MemoCard memo={reacted([partyByAlice])} />);

    expect(screen.getByRole('img', { name: 'Alice reacted with 🎉' })).toBeInTheDocument();
  });

  it('shows an anonymous reader the pills, not as buttons, and offers no way to react', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);
    await renderWithRouter(<MemoCard memo={reacted([thumbsUpByAliceAndMe, partyByAlice])} />);

    const row = within(reactionRow()!);
    expect(row.getByText('👍')).toBeInTheDocument();
    expect(row.getByText('🎉')).toBeInTheDocument();
    expect(row.queryAllByRole('button')).toEqual([]);
    expect(screen.queryByRole('button', { name: 'React' })).not.toBeInTheDocument();
  });
});
