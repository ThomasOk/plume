import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChangePassword } from '../hooks/use-change-password';
import { useLinkedAccounts } from '../hooks/use-linked-accounts';
import { PasswordSection } from './password-section';

vi.mock('../hooks/use-linked-accounts');
vi.mock('../hooks/use-change-password');

const mockChangePassword = vi.fn();

const linkAccounts = (...providerIds: string[]) =>
  vi.mocked(useLinkedAccounts).mockReturnValue({
    data: providerIds.map((providerId) => ({ providerId })),
  } as any);

beforeEach(() => {
  mockChangePassword.mockReset();
  vi.mocked(useChangePassword).mockReturnValue({
    mutateAsync: mockChangePassword,
  } as any);
});

describe('PasswordSection', () => {
  it('shows no password form to a user who signs in with Google only', () => {
    linkAccounts('google');
    render(<PasswordSection />);

    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
  });

  it('shows the password form to a user who signs in with a password', () => {
    linkAccounts('google', 'credential');
    render(<PasswordSection />);

    expect(screen.getByLabelText('Current password')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
  });

  it('catches mismatched new passwords before submitting', async () => {
    const user = userEvent.setup();
    linkAccounts('credential');
    render(<PasswordSection />);

    await user.type(screen.getByLabelText('Current password'), 'old-password');
    await user.type(screen.getByLabelText('New password'), 'new-password');
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'new-pasword',
    );
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(
      await screen.findByText('Passwords do not match'),
    ).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('changes the password and signs out other devices when asked', async () => {
    const user = userEvent.setup();
    linkAccounts('credential');
    render(<PasswordSection />);

    await user.type(screen.getByLabelText('Current password'), 'old-password');
    await user.type(screen.getByLabelText('New password'), 'new-password');
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'new-password',
    );
    await user.click(screen.getByLabelText('Sign out every other device'));
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    await vi.waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'old-password',
        newPassword: 'new-password',
        revokeOtherSessions: true,
      });
    });
  });

  it('shows the error returned for a wrong current password', async () => {
    const user = userEvent.setup();
    mockChangePassword.mockRejectedValue(new Error('Invalid password'));
    linkAccounts('credential');
    render(<PasswordSection />);

    await user.type(
      screen.getByLabelText('Current password'),
      'wrong-password',
    );
    await user.type(screen.getByLabelText('New password'), 'new-password');
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'new-password',
    );
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid password',
    );
  });

  it('says so when the sign-in methods cannot be loaded, rather than hiding the form silently', () => {
    vi.mocked(useLinkedAccounts).mockReturnValue({ isError: true } as any);
    render(<PasswordSection />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your password settings could not be loaded.',
    );
  });
});
