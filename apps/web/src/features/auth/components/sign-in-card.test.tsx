import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../hooks/use-auth';
import { SignInCard } from './sign-in-card';
import { renderWithRouter } from '@/tests/render-with-router';

vi.mock('../hooks/use-auth');

const mockLogin = vi.fn();

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    login: mockLogin,
    signInWithGoogle: vi.fn(),
    isGoogleLoading: false,
  } as any);
});

describe('SignInCard', () => {
  it('renders email and password fields', async () => {
    await renderWithRouter(<SignInCard />);

    expect(
      screen.getByPlaceholderText('Enter email address'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
  });

  it('shows validation error for empty password', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<SignInCard />);

    await user.type(
      screen.getByPlaceholderText('Enter email address'),
      'test@example.com',
    );
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Required')).toBeInTheDocument();
  });

  it('calls login with correct values on submit', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<SignInCard />);

    await user.type(
      screen.getByPlaceholderText('Enter email address'),
      'test@example.com',
    );
    await user.type(
      screen.getByPlaceholderText('Enter password'),
      'password123',
    );
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await vi.waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });
});
