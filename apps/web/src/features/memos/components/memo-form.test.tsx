import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCreateMemo } from '../hooks/use-create-memo';
import { useCreateSpaceMemo } from '../hooks/use-create-space-memo';
import { useMemoScope } from '../hooks/use-memo-scope';
import { MemoForm } from './memo-form';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useSpace } from '@/features/spaces/hooks/use-space';
import { renderWithRouter } from '@/tests/render-with-router';

vi.mock('../hooks/use-create-memo');
vi.mock('../hooks/use-create-space-memo');
vi.mock('../hooks/use-create-comment', () => ({
  useCreateComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../hooks/use-memo-scope');
vi.mock('./tag-suggestions', () => ({ TagSuggestions: () => null }));
// The lazily loaded picker, replaced by a few emojis: the tests hold the editor, not the library.
vi.mock('./emoji-picker', () => ({
  EmojiPicker: ({ onEmojiSelect }: { onEmojiSelect: (emoji: string) => void }) => (
    <div>
      {['🔥', '🎉'].map((emoji) => (
        <button key={emoji} type="button" onClick={() => onEmojiSelect(emoji)}>
          {emoji}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('@/features/auth/hooks/use-auth');
vi.mock('@/features/spaces/hooks/use-space');
vi.mock('@/features/attachments', () => ({
  AttachmentList: () => null,
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

const USER_ID = 'user-1';
const mockCreateMemo = vi.fn();
const mockCreateSpaceMemo = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockCreateMemo.mockReset().mockResolvedValue({ id: 'memo-1' });
  mockCreateSpaceMemo.mockReset().mockResolvedValue({ id: 'memo-1' });
  vi.mocked(useCreateMemo).mockReturnValue({ mutateAsync: mockCreateMemo, isPending: false } as any);
  vi.mocked(useCreateSpaceMemo).mockReturnValue({ mutateAsync: mockCreateSpaceMemo, isPending: false } as any);
  vi.mocked(useAuth).mockReturnValue({ user: { id: USER_ID } } as any);
  vi.mocked(useSpace).mockImplementation(
    (spaceId) => ({ data: spaceId ? { id: spaceId, title: 'Cooking club' } : undefined }) as any,
  );
});

const inPersonalScope = () => vi.mocked(useMemoScope).mockReturnValue({ kind: 'personal' });
const inSpace = (spaceId = 'club') => vi.mocked(useMemoScope).mockReturnValue({ kind: 'space', spaceId });

const write = async (content: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('Write your memo here...'), content);
  await user.click(screen.getByRole('button', { name: 'Save' }));
};

describe('MemoForm, inside a space', () => {
  beforeEach(() => inSpace());

  it('offers no audience choice and names the space', async () => {
    await renderWithRouter(<MemoForm />);

    expect(screen.queryByRole('button', { name: /^Audience/ })).not.toBeInTheDocument();
    expect(screen.getByText('Cooking club')).toBeInTheDocument();
  });

  it('writes the memo into that space', async () => {
    await renderWithRouter(<MemoForm />);

    await write('Pasta night');

    await vi.waitFor(() =>
      expect(mockCreateSpaceMemo).toHaveBeenCalledWith({ spaceId: 'club', content: 'Pasta night' }),
    );
    expect(mockCreateMemo).not.toHaveBeenCalled();
  });
});

describe('MemoForm, in the personal scope', () => {
  beforeEach(() => inPersonalScope());

  it('offers private and public only', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<MemoForm />);

    await user.click(screen.getByRole('button', { name: 'Audience: Private' }));

    const options = await screen.findAllByRole('menuitem');
    expect(options.map((option) => option.textContent)).toEqual(['Private', 'Public']);
  });

  it('writes a personal memo with the chosen visibility', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<MemoForm />);

    await user.click(screen.getByRole('button', { name: 'Audience: Private' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Public' }));
    await write('Hello world');

    await vi.waitFor(() =>
      expect(mockCreateMemo).toHaveBeenCalledWith({ content: 'Hello world', visibility: 'public' }),
    );
    expect(mockCreateSpaceMemo).not.toHaveBeenCalled();
  });
});

describe('MemoForm, drafts', () => {
  const personalDraftKey = `${USER_ID}-memo-draft`;
  const spaceDraftKey = `${USER_ID}-memo-draft-space-club`;
  const textarea = () => screen.getByPlaceholderText<HTMLTextAreaElement>('Write your memo here...');

  it('restores a personal draft, including one saved before drafts were per scope', async () => {
    localStorage.setItem(personalDraftKey, 'A note for myself');
    inPersonalScope();

    await renderWithRouter(<MemoForm />);

    await vi.waitFor(() => expect(textarea()).toHaveValue('A note for myself'));
  });

  it('does not carry a personal draft into a space', async () => {
    localStorage.setItem(personalDraftKey, 'A note for myself');
    inSpace();

    await renderWithRouter(<MemoForm />);

    expect(textarea()).toHaveValue('');
  });

  it('does not carry a space draft into the personal scope', async () => {
    localStorage.setItem(spaceDraftKey, 'Agenda for the club');
    inPersonalScope();

    await renderWithRouter(<MemoForm />);

    expect(textarea()).toHaveValue('');
  });

  it('restores a space draft in its own space', async () => {
    localStorage.setItem(spaceDraftKey, 'Agenda for the club');
    inSpace();

    await renderWithRouter(<MemoForm />);

    await vi.waitFor(() => expect(textarea()).toHaveValue('Agenda for the club'));
  });
});

describe('MemoForm, emojis', () => {
  beforeEach(() => inPersonalScope());

  it('offers an emoji button when writing a memo', async () => {
    await renderWithRouter(<MemoForm />);

    expect(screen.getByRole('button', { name: 'Insert emoji' })).toBeInTheDocument();
  });

  it('offers an emoji button when writing a comment', async () => {
    await renderWithRouter(<MemoForm parentMemoId="memo-1" />);

    expect(screen.getByRole('button', { name: 'Insert emoji' })).toBeInTheDocument();
  });

  const textarea = () => screen.getByPlaceholderText<HTMLTextAreaElement>('Write your memo here...');
  const openPicker = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Insert emoji' }));
    return screen.findByRole('dialog', { name: 'Emoji picker' });
  };

  it('inserts the emoji at the caret, in the middle of existing text', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<MemoForm />);
    await user.type(textarea(), 'Pasta night');
    textarea().setSelectionRange(5, 5);

    await openPicker(user);
    await user.click(await screen.findByRole('button', { name: '🔥' }));

    expect(textarea()).toHaveValue('Pasta🔥 night');
  });

  it('replaces the selected text with the emoji', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<MemoForm />);
    await user.type(textarea(), 'Pasta night');
    textarea().setSelectionRange(6, 11);

    await openPicker(user);
    await user.click(await screen.findByRole('button', { name: '🎉' }));

    expect(textarea()).toHaveValue('Pasta 🎉');
  });

  it('stays open after a pick, for the next one', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<MemoForm />);

    await openPicker(user);
    await user.click(await screen.findByRole('button', { name: '🔥' }));
    await user.click(screen.getByRole('button', { name: '🎉' }));

    expect(screen.getByRole('dialog', { name: 'Emoji picker' })).toBeInTheDocument();
    expect(textarea()).toHaveValue('🔥🎉');
  });

  it('closing the picker puts the writer back in the text, after the last emoji', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<MemoForm />);
    await user.type(textarea(), 'Pasta night');
    textarea().setSelectionRange(5, 5);

    await openPicker(user);
    await user.click(await screen.findByRole('button', { name: '🔥' }));
    await user.keyboard('{Escape}');

    await vi.waitFor(() => expect(textarea()).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: 'Emoji picker' })).not.toBeInTheDocument();
    expect(textarea().selectionStart).toBe('Pasta🔥'.length);
    await user.keyboard('!');
    expect(textarea()).toHaveValue('Pasta🔥! night');
  });

  it('saves an inserted emoji with the memo, and keeps it in the draft', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<MemoForm />);
    await user.type(textarea(), 'Pasta night ');

    await openPicker(user);
    await user.click(await screen.findByRole('button', { name: '🎉' }));

    await vi.waitFor(() => expect(localStorage.getItem(`${USER_ID}-memo-draft`)).toBe('Pasta night 🎉'));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await vi.waitFor(() =>
      expect(mockCreateMemo).toHaveBeenCalledWith({ content: 'Pasta night 🎉', visibility: 'private' }),
    );
  });
});
