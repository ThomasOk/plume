import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/ui/components/alert-dialog';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { deletionRefusal, type DeletionRefusal } from '../deletion-refusal';
import { useDeleteAccount } from '../hooks/use-delete-account';
import { useLinkedAccounts } from '../hooks/use-linked-accounts';

interface DeleteAccountSectionProps {
  email: string;
}

// The danger zone at the bottom of the Account section: deleting the account acts on who the
// user is, which is what that section is about.
export const DeleteAccountSection = ({ email }: DeleteAccountSectionProps) => (
  <section className="space-y-4 rounded-lg border border-destructive/40 p-4">
    <div>
      <h2 className="text-lg font-semibold">Delete account</h2>
      <p className="text-sm text-muted-foreground">
        Your personal memos are deleted with your account. This cannot be undone.
      </p>
    </div>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <DeleteAccountConfirmation email={email} />
      </AlertDialogContent>
    </AlertDialog>
  </section>
);

const DeleteAccountConfirmation = ({ email }: DeleteAccountSectionProps) => {
  const { data: accounts } = useLinkedAccounts();
  const deleteAccount = useDeleteAccount();
  const [typedEmail, setTypedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [refusal, setRefusal] = useState<DeletionRefusal | null>(null);

  const hasPassword = accounts?.some((account) => account.providerId === 'credential') ?? false;
  // Exactly as written, though the server compares without case: typing it out is the point.
  const confirmed = typedEmail === email;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setRefusal(null);
    try {
      await deleteAccount.mutateAsync(hasPassword ? { email: typedEmail, password } : { email: typedEmail });
    } catch (error) {
      setRefusal(deletionRefusal(error));
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <AlertDialogHeader>
        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-2">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Your personal memos, private and public, are deleted, with every comment under
                them and their attachments.
              </li>
              <li>
                Your memos in a space, and your comments under other people&rsquo;s memos, stay.
                They are shown as written by &ldquo;Deleted user&rdquo;.
              </li>
              <li>A space where you are the only member is deleted, with its memos.</li>
              <li>You are signed out on every device.</li>
            </ul>
            <p>
              <Link to="/settings/export" className="font-medium underline underline-offset-4">
                Export your memos first
              </Link>
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="space-y-2">
        <Label htmlFor="delete-account-email">
          Type your email, <span className="font-semibold">{email}</span>, to confirm
        </Label>
        <Input
          id="delete-account-email"
          value={typedEmail}
          onChange={(event) => setTypedEmail(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {hasPassword && (
        <div className="space-y-2">
          <Label htmlFor="delete-account-password">Password</Label>
          <Input
            id="delete-account-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </div>
      )}

      {refusal && <RefusalMessage refusal={refusal} onSignInAgain={deleteAccount.signInAgain} />}

      <AlertDialogFooter>
        <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
        <Button type="submit" variant="destructive" disabled={!confirmed || deleteAccount.isPending}>
          Delete my account
        </Button>
      </AlertDialogFooter>
    </form>
  );
};

const RefusalMessage = ({
  refusal,
  onSignInAgain,
}: {
  refusal: DeletionRefusal;
  onSignInAgain: () => void;
}) => {
  switch (refusal.kind) {
    case 'last-admin':
      return (
        <div role="alert" className="space-y-1 text-sm text-destructive">
          <p>You are the only admin of these spaces. Make someone else an admin of each first:</p>
          <ul className="list-disc pl-5">
            {refusal.spaces.map((space) => (
              <li key={space.id}>
                <Link
                  to="/spaces/$spaceId/members"
                  params={{ spaceId: space.id }}
                  className="underline underline-offset-4"
                >
                  {space.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'reauthenticate':
      return (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>For your security, sign in again before deleting your account.</p>
          <Button type="button" variant="outline" size="sm" onClick={onSignInAgain}>
            Sign in again
          </Button>
        </div>
      );
    case 'other':
      return (
        <p role="alert" className="text-sm text-destructive">
          {refusal.message}
        </p>
      );
  }
};
