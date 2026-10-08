import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TRPCClientError } from '@trpc/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDeleteAccount } from '../hooks/use-delete-account';
import { useLinkedAccounts } from '../hooks/use-linked-accounts';
import { DeleteAccountSection } from './delete-account-section';
import { renderWithRouter } from '@/tests/render-with-router';

vi.mock('../hooks/use-linked-accounts');
vi.mock('../hooks/use-delete-account');

const mockDeleteAccount = vi.fn();
const mockSignInAgain = vi.fn();

const EMAIL = 'alice@example.com';

const linkAccounts = (...providerIds: string[]) =>
  vi.mocked(useLinkedAccounts).mockReturnValue({
    data: providerIds.map((providerId) => ({ providerId })),
  } as any);

// A refusal as the server sends it: a tRPC code, a message, and the spaces a last-admin
// refusal names.
const refusedWith = (
  code: string,
  message: string,
  spaces: { id: string; name: string }[] | null = null,
) =>
  new TRPCClientError(message, {
    result: { error: { message, code: -32000, data: { code, httpStatus: 400, spaces } } },
  } as any);

beforeEach(() => {
  mockDeleteAccount.mockReset();
  mockSignInAgain.mockReset();
  vi.mocked(useDeleteAccount).mockReturnValue({
    mutateAsync: mockDeleteAccount,
    signInAgain: mockSignInAgain,
    isPending: false,
  } as any);
});

const openConfirmation = async () => {
  const user = userEvent.setup();
  await renderWithRouter(<DeleteAccountSection email={EMAIL} />);
  await user.click(screen.getByRole('button', { name: 'Delete account' }));
  return { user, dialog: await screen.findByRole('alertdialog') };
};

describe('DeleteAccountSection', () => {
  it('keeps the deletion disabled until the email is typed exactly', async () => {
    linkAccounts('credential');
    const { user, dialog } = await openConfirmation();
    const confirm = within(dialog).getByRole('button', { name: 'Delete my account' });
    const email = within(dialog).getByLabelText(/Type your email/);

    expect(confirm).toBeDisabled();
    await user.type(email, 'Alice@example.com');
    expect(confirm).toBeDisabled();
    await user.clear(email);
    await user.type(email, EMAIL);
    expect(confirm).toBeEnabled();
  });

  it('offers to export the memos first', async () => {
    linkAccounts('credential');
    const { dialog } = await openConfirmation();

    expect(within(dialog).getByRole('link', { name: 'Export your memos first' })).toHaveAttribute(
      'href',
      '/settings/export',
    );
  });

  it('asks for the password of an account that has one, and sends it', async () => {
    linkAccounts('credential');
    const { user, dialog } = await openConfirmation();

    await user.type(within(dialog).getByLabelText(/Type your email/), EMAIL);
    await user.type(within(dialog).getByLabelText('Password'), 'correct-horse-battery');
    await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }));

    expect(mockDeleteAccount).toHaveBeenCalledWith({ email: EMAIL, password: 'correct-horse-battery' });
  });

  it('asks no password of an account that signs in with Google only', async () => {
    linkAccounts('google');
    const { user, dialog } = await openConfirmation();

    expect(within(dialog).queryByLabelText('Password')).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Type your email/), EMAIL);
    await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }));

    expect(mockDeleteAccount).toHaveBeenCalledWith({ email: EMAIL });
  });

  it('lists the spaces that need another admin when the user is their last one', async () => {
    linkAccounts('credential');
    mockDeleteAccount.mockRejectedValue(
      refusedWith('CONFLICT', 'You are the only admin of spaces with other members.', [
        { id: 'band', name: 'Band' },
        { id: 'club', name: 'Cooking club' },
      ]),
    );
    const { user, dialog } = await openConfirmation();

    await user.type(within(dialog).getByLabelText(/Type your email/), EMAIL);
    await user.type(within(dialog).getByLabelText('Password'), 'correct-horse-battery');
    await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }));

    const alert = await within(dialog).findByRole('alert');
    expect(within(alert).getByRole('link', { name: 'Band' })).toHaveAttribute('href', '/spaces/band/members');
    expect(within(alert).getByRole('link', { name: 'Cooking club' })).toHaveAttribute(
      'href',
      '/spaces/club/members',
    );
  });

  it('offers to sign in again when the sign-in is not recent enough', async () => {
    linkAccounts('google');
    mockDeleteAccount.mockRejectedValue(
      refusedWith('PRECONDITION_FAILED', 'Sign in again to delete your account'),
    );
    const { user, dialog } = await openConfirmation();

    await user.type(within(dialog).getByLabelText(/Type your email/), EMAIL);
    await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Sign in again' }));

    expect(mockSignInAgain).toHaveBeenCalled();
  });

  it('shows the server\'s words for a wrong password', async () => {
    linkAccounts('credential');
    mockDeleteAccount.mockRejectedValue(refusedWith('BAD_REQUEST', 'Incorrect password'));
    const { user, dialog } = await openConfirmation();

    await user.type(within(dialog).getByLabelText(/Type your email/), EMAIL);
    await user.type(within(dialog).getByLabelText('Password'), 'wrong-password');
    await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Incorrect password');
  });
});
