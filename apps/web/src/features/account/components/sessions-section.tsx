import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import Bowser from 'bowser';
import { formatDistanceToNow } from 'date-fns';
import { useId } from 'react';
import { toast } from 'sonner';
import { useRevokeOtherSessions } from '../hooks/use-revoke-other-sessions';
import { useRevokeSession } from '../hooks/use-revoke-session';
import { useSessions } from '../hooks/use-sessions';

interface SessionsSectionProps {
  currentSessionId: string;
}

export const SessionsSection = ({ currentSessionId }: SessionsSectionProps) => {
  const sessions = useSessions();
  const revokeSession = useRevokeSession();
  const revokeOtherSessions = useRevokeOtherSessions();

  // A revoked session leaves the list when the hooks refetch it.
  const onRevoke = async (token: string) => {
    try {
      await revokeSession.mutateAsync(token);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onRevokeOthers = async () => {
    try {
      await revokeOtherSessions.mutateAsync();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const hasOtherSessions =
    sessions.data?.some((session) => session.id !== currentSessionId) ?? false;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Sessions</h2>
        <p className="text-sm text-muted-foreground">
          The devices you are signed in on.
        </p>
      </div>
      {sessions.isLoading && (
        <p className="text-sm text-muted-foreground">Loading sessions…</p>
      )}
      {sessions.isError && (
        <p role="alert" className="text-sm text-destructive">
          Your sessions could not be loaded.
        </p>
      )}
      {sessions.data && (
        <ul className="divide-y rounded-md border" aria-label="Sessions">
          {sessions.data.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              isCurrent={session.id === currentSessionId}
              onRevoke={() => onRevoke(session.token)}
              isRevoking={revokeSession.isPending}
            />
          ))}
        </ul>
      )}
      {hasOtherSessions && (
        <Button
          variant="outline"
          onClick={onRevokeOthers}
          disabled={revokeOtherSessions.isPending}
        >
          Sign out all other sessions
        </Button>
      )}
    </section>
  );
};

interface SessionRowProps {
  session: {
    userAgent?: string | null;
    ipAddress?: string | null;
    updatedAt: Date;
  };
  isCurrent: boolean;
  onRevoke: () => void;
  isRevoking: boolean;
}

const SessionRow = ({
  session,
  isCurrent,
  onRevoke,
  isRevoking,
}: SessionRowProps) => {
  const labelId = useId();

  return (
    <li aria-labelledby={labelId} className="flex items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p id={labelId} className="truncate">
          {describeDevice(session.userAgent)}
        </p>
        <p className="text-xs text-muted-foreground">
          {session.ipAddress ?? 'Unknown IP address'} · Last active{' '}
          {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
        </p>
      </div>
      {isCurrent ? (
        <Badge variant="secondary">This device</Badge>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRevoke}
          disabled={isRevoking}
          aria-describedby={labelId}
        >
          Sign out
        </Button>
      )}
    </li>
  );
};

// "Chrome on macOS" from the stored user agent. A user agent bowser cannot read (or none
// at all) still gets a label, so that no session is hidden from the user.
const describeDevice = (userAgent: string | null | undefined) => {
  if (!userAgent) return 'Unknown device';
  const { browser, os } = Bowser.parse(userAgent);
  if (browser.name && os.name) return `${browser.name} on ${os.name}`;
  return browser.name || os.name || 'Unknown device';
};
