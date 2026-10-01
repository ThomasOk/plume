import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SpaceDetails } from '@/lib/types';
import { useDeleteSpace } from '../hooks/use-delete-space';
import { useLeaveSpace } from '../hooks/use-leave-space';
import { useRenameSpace } from '../hooks/use-rename-space';
import { SpaceActionsMenu } from './space-actions-menu';
import { useMemosStats } from '@/features/memos';
import { renderWithRouter } from '@/tests/render-with-router';

vi.mock('../hooks/use-delete-space');
vi.mock('../hooks/use-leave-space');
vi.mock('../hooks/use-rename-space');
vi.mock('@/features/memos', () => ({ useMemosStats: vi.fn() }));

const mockLeave = vi.fn();

beforeEach(() => {
  mockLeave.mockReset();
  vi.mocked(useLeaveSpace).mockReturnValue({ mutateAsync: mockLeave, isPending: false } as any);
  vi.mocked(useDeleteSpace).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
  vi.mocked(useRenameSpace).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
  vi.mocked(useMemosStats).mockReturnValue({ data: undefined, isLoading: false } as any);
});

const club = (facts: Pick<SpaceDetails, 'role' | 'memberCount' | 'adminCount'>): SpaceDetails => ({
  id: 'club',
  title: 'Cooking club',
  ...facts,
});

const openLeave = async (space: SpaceDetails) => {
  const user = userEvent.setup();
  await renderWithRouter(<SpaceActionsMenu space={space} onGone={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: 'Space actions' }));
  await user.click(await screen.findByRole('menuitem', { name: 'Leave space' }));
  return user;
};

describe('SpaceActionsMenu, leaving', () => {
  it('lets a member leave', async () => {
    const user = await openLeave(club({ role: 'member', memberCount: 2, adminCount: 1 }));

    await user.click(screen.getByRole('button', { name: 'Leave' }));

    await vi.waitFor(() => expect(mockLeave).toHaveBeenCalledWith({ spaceId: 'club' }));
  });

  it('lets an admin leave while another admin remains', async () => {
    await openLeave(club({ role: 'admin', memberCount: 2, adminCount: 2 }));

    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
  });

  it('sends the last admin to promote someone, instead of offering to leave', async () => {
    await openLeave(club({ role: 'admin', memberCount: 3, adminCount: 1 }));

    expect(screen.getByText('You are the only admin of Cooking club')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage members' })).toHaveAttribute(
      'href',
      '/spaces/club/members',
    );
    expect(screen.queryByRole('button', { name: 'Leave' })).not.toBeInTheDocument();
  });

  it('points the only member to deleting the space', async () => {
    const user = await openLeave(club({ role: 'admin', memberCount: 1, adminCount: 1 }));

    expect(screen.getByText('You are the only member of Cooking club')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Leave' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete space' }));

    expect(await screen.findByText('Delete Cooking club?')).toBeInTheDocument();
    expect(mockLeave).not.toHaveBeenCalled();
  });
});
