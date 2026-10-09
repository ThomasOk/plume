import { screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useComments } from '../hooks/use-comments';
import { CommentSection } from './comment-section';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { renderWithRouter } from '@/tests/render-with-router';

vi.mock('../hooks/use-comments');
vi.mock('@/features/auth/hooks/use-auth');
vi.mock('./memo-list-skeleton', () => ({ MemoListSkeleton: () => <p>Loading comments</p> }));
vi.mock('./memo-card', () => ({ MemoCard: ({ memo }: any) => <p>{memo.content}</p> }));

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
