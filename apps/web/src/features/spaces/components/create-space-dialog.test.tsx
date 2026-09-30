import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCreateSpace } from '../hooks/use-create-space';
import { CreateSpaceDialog } from './create-space-dialog';
import { renderWithRouter } from '@/tests/render-with-router';

vi.mock('../hooks/use-create-space');

const mockCreate = vi.fn();

beforeEach(() => {
  mockCreate.mockReset();
  vi.mocked(useCreateSpace).mockReturnValue({
    mutateAsync: mockCreate,
    isPending: false,
  } as any);
});

describe('CreateSpaceDialog', () => {
  it('refuses a blank title', async () => {
    const user = userEvent.setup();
    await renderWithRouter(
      <CreateSpaceDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Title'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates the space with the trimmed title and hands it back', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const created = { id: 'space-1', title: 'Cooking club', role: 'admin' };
    mockCreate.mockResolvedValue(created);
    await renderWithRouter(
      <CreateSpaceDialog open onOpenChange={vi.fn()} onCreated={onCreated} />,
    );

    await user.type(screen.getByLabelText('Title'), '  Cooking club  ');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await vi.waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ title: 'Cooking club' });
      expect(onCreated).toHaveBeenCalledWith(created);
    });
  });
});
