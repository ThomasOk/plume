import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useComments } from '../hooks/use-comments';
import { CommentSection } from './comment-section';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { renderWithRouter } from '@/tests/render-with-router';

vi.mock('../hooks/use-comments');
vi.mock('@/features/auth/hooks/use-auth');
vi.mock('./memo-list-skeleton', () => ({ CommentListSkeleton: () => <p>Loading comments</p> }));
vi.mock('./compact-comment', () => ({
  CompactComment: ({ comment }: any) => <p id={comment.id}>{comment.content}</p>,
}));
// The form itself is the memo form's to test: here it is only a text field.
vi.mock('./memo-form', () => ({
  MemoForm: () => (
    <form aria-label="New comment">
      <textarea aria-label="Comment" />
    </form>
  ),
}));

const comment = (id: string, content: string) => ({ id, parentId: 'memo-1', content });

// A link from the strip under a card in the list leads to one comment on the memo's page.
describe('CommentSection, reached by a link to one comment', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);
    // The comments arrive after the page, as they do from the API: by then the router has
    // already looked for the anchor and found nothing.
    vi.mocked(useComments).mockImplementation(() => {
      const [isLoading, setIsLoading] = useState(true);
      useEffect(() => {
        const timeout = setTimeout(() => setIsLoading(false), 10);
        return () => clearTimeout(timeout);
      }, []);
      return (isLoading
        ? { data: undefined, isLoading }
        : { data: [comment('c-1', 'First'), comment('c-2', 'Second')], isLoading }) as any;
    });
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    scrollIntoView.mockReset();
  });

  it('gives each comment its id as anchor', async () => {
    await renderWithRouter(<CommentSection memoId="memo-1" />);

    expect((await screen.findByText('Second')).closest('#c-2')).not.toBeNull();
  });

  it('scrolls to the comment the link names', async () => {
    await renderWithRouter(<CommentSection memoId="memo-1" />, { path: '/#c-2' });

    await waitFor(() =>
      expect(scrollIntoView.mock.contexts.map((element: any) => element.id)).toContain('c-2'),
    );
  });
});

describe('CommentSection, writing a comment', () => {
  const scrollIntoView = vi.fn();
  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
  });
  afterEach(() => {
    scrollIntoView.mockReset();
  });

  const withComments = (...comments: ReturnType<typeof comment>[]) =>
    vi.mocked(useComments).mockReturnValue({ data: comments, isLoading: false } as any);
  const signedIn = () => vi.mocked(useAuth).mockReturnValue({ user: { id: 'alice' } } as any);
  const anonymous = () => vi.mocked(useAuth).mockReturnValue({ user: null } as any);
  const isAfter = (element: Node, reference: Node) =>
    Boolean(reference.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('shows the form under the comments, where the new one will land', async () => {
    signedIn();
    withComments(comment('c-1', 'First'), comment('c-2', 'Second'));
    await renderWithRouter(<CommentSection memoId="memo-1" />);

    expect(isAfter(screen.getByRole('form', { name: 'New comment' }), screen.getByText('Second'))).toBe(true);
  });

  it('leaves the focus where it is on arrival', async () => {
    signedIn();
    withComments(comment('c-1', 'First'));
    await renderWithRouter(<CommentSection memoId="memo-1" />);

    expect(screen.getByRole('textbox', { name: 'Comment' })).not.toHaveFocus();
  });

  it('puts the caret in the form from the shortcut in the heading, the whole form in view', async () => {
    signedIn();
    withComments(comment('c-1', 'First'));
    await renderWithRouter(<CommentSection memoId="memo-1" />);

    await userEvent.click(screen.getByRole('button', { name: 'Write a comment' }));

    expect(screen.getByRole('textbox', { name: 'Comment' })).toHaveFocus();
    expect(scrollIntoView.mock.contexts).toContain(
      screen.getByRole('form', { name: 'New comment' }).parentElement,
    );
  });

  it('heads the comments with their number', async () => {
    anonymous();
    withComments(comment('c-1', 'First'), comment('c-2', 'Second'));
    await renderWithRouter(<CommentSection memoId="memo-1" />);

    expect(screen.getByRole('heading', { name: 'Comments (2)' })).toBeInTheDocument();
  });

  it('reads the comments oldest first, as the API returns them', async () => {
    anonymous();
    withComments(comment('c-1', 'First'), comment('c-2', 'Second'), comment('c-3', 'Third'));
    await renderWithRouter(<CommentSection memoId="memo-1" />);

    const texts = screen.getAllByText(/First|Second|Third/).map((element) => element.textContent);
    expect(texts).toEqual(['First', 'Second', 'Third']);
  });

  it('is only the form to write one when there are no comments', async () => {
    signedIn();
    withComments();
    await renderWithRouter(<CommentSection memoId="memo-1" />);

    expect(screen.getByRole('form', { name: 'New comment' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Comments/ })).not.toBeInTheDocument();
  });

  it('offers an anonymous reader no way to write one', async () => {
    anonymous();
    withComments(comment('c-1', 'First'));
    await renderWithRouter(<CommentSection memoId="memo-1" />);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'New comment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Write a comment' })).not.toBeInTheDocument();
  });
});
