import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRevokeOtherSessions } from '../hooks/use-revoke-other-sessions';
import { useRevokeSession } from '../hooks/use-revoke-session';
import { useSessions } from '../hooks/use-sessions';
import { SessionsSection } from './sessions-section';

vi.mock('../hooks/use-sessions');
vi.mock('../hooks/use-revoke-session');
vi.mock('../hooks/use-revoke-other-sessions');

const mockRevokeSession = vi.fn();
const mockRevokeOtherSessions = vi.fn();

beforeEach(() => {
  mockRevokeSession.mockReset();
  mockRevokeOtherSessions.mockReset();
  vi.mocked(useRevokeSession).mockReturnValue({
    mutateAsync: mockRevokeSession,
  } as any);
  vi.mocked(useRevokeOtherSessions).mockReturnValue({
    mutateAsync: mockRevokeOtherSessions,
  } as any);
});

const CHROME_ON_MACOS =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FIREFOX_ON_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';

const session = (overrides: Record<string, unknown>) => ({
  id: 'session',
  token: 'token',
  ipAddress: '203.0.113.7',
  userAgent: CHROME_ON_MACOS,
  updatedAt: new Date(),
  ...overrides,
});

const listSessions = (...sessions: ReturnType<typeof session>[]) =>
  vi.mocked(useSessions).mockReturnValue({ data: sessions } as any);

describe('SessionsSection', () => {
  it('marks the current session "This device", with no sign-out button of its own', () => {
    listSessions(
      session({ id: 'current', token: 'current-token' }),
      session({
        id: 'other',
        token: 'other-token',
        userAgent: FIREFOX_ON_WINDOWS,
        ipAddress: '198.51.100.4',
      }),
    );
    render(<SessionsSection currentSessionId="current" />);

    const current = screen.getByRole('listitem', { name: 'Chrome on macOS' });
    expect(within(current).getByText('This device')).toBeInTheDocument();
    expect(within(current).getByText(/203\.0\.113\.7/)).toBeInTheDocument();
    expect(within(current).queryByRole('button')).not.toBeInTheDocument();

    const other = screen.getByRole('listitem', { name: 'Firefox on Windows' });
    expect(within(other).queryByText('This device')).not.toBeInTheDocument();
    expect(
      within(other).getByRole('button', { name: 'Sign out' }),
    ).toBeInTheDocument();
  });

  it('still lists a session whose browser cannot be identified, with a generic label', () => {
    listSessions(
      session({ id: 'current' }),
      session({ id: 'script', userAgent: 'curl/8.4.0' }),
      session({ id: 'blank', userAgent: '' }),
    );
    render(<SessionsSection currentSessionId="current" />);

    expect(
      screen.getAllByRole('listitem', { name: 'Unknown device' }),
    ).toHaveLength(2);
  });

  it('signs out one other session by its token', async () => {
    const user = userEvent.setup();
    listSessions(
      session({ id: 'current', token: 'current-token' }),
      session({
        id: 'other',
        token: 'other-token',
        userAgent: FIREFOX_ON_WINDOWS,
      }),
    );
    render(<SessionsSection currentSessionId="current" />);

    const other = screen.getByRole('listitem', { name: 'Firefox on Windows' });
    await user.click(within(other).getByRole('button', { name: 'Sign out' }));

    expect(mockRevokeSession).toHaveBeenCalledWith('other-token');
  });

  it('signs out every session but this one in one action', async () => {
    const user = userEvent.setup();
    listSessions(
      session({ id: 'current' }),
      session({ id: 'other', userAgent: FIREFOX_ON_WINDOWS }),
    );
    render(<SessionsSection currentSessionId="current" />);

    await user.click(
      screen.getByRole('button', { name: 'Sign out all other sessions' }),
    );

    expect(mockRevokeOtherSessions).toHaveBeenCalled();
  });

  it('offers no "sign out all" when this is the only session', () => {
    listSessions(session({ id: 'current' }));
    render(<SessionsSection currentSessionId="current" />);

    expect(
      screen.queryByRole('button', { name: 'Sign out all other sessions' }),
    ).not.toBeInTheDocument();
  });
});
