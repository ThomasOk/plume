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
import { useSpaces } from '@/features/spaces';
import { sounds } from '@/lib/sounds';

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
        <Button variant="destructive" onClick={sounds.warning}>Delete account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <DeleteAccountConfirmation email={email} />
      </AlertDialogContent>
    </AlertDialog>
  </section>
);

const DeleteAccountConfirmation = ({ email }: DeleteAccountSectionProps) => {
  const { data: accounts, isError: accountsFailed } = useLinkedAccounts();
  const deleteAccount = useDeleteAccount();
  const { data: spaces } = useSpaces();
  const [typedEmail, setTypedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [refusal, setRefusal] = useState<DeletionRefusal | null>(null);

  // Unknown until the linked accounts load, and the deletion waits for it: a user with a
  // password would otherwise be refused for leaving out a field that was never shown.
  const hasPassword = accounts?.some((account) => account.providerId === 'credential');
  // Exactly as written, though the server compares without case: typing it out is the point.
  const confirmed = typedEmail === email;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    sounds.click();
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
              <SpacesDeletedWith spaces={spaces} />
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
        {/* `block`: the Label is a flex row, which would set the sentence and the email
            side by side as columns. */}
        <Label htmlFor="delete-account-email" className="block leading-normal">
          Type your email, <span className="font-semibold break-all">{email}</span>, to confirm
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

      {accountsFailed && (
        <p role="alert" className="text-sm text-destructive">
          Your sign-in methods could not be loaded.
        </p>
      )}

      {refusal && <RefusalMessage refusal={refusal} onSignInAgain={deleteAccount.signInAgain} />}

      <AlertDialogFooter>
        <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
        <Button type="submit" variant="destructive" disabled={!confirmed || hasPassword === undefined || deleteAccount.isPending}>
          Delete my account
        </Button>
      </AlertDialogFooter>
    </form>
  );
};

// A space with no other member goes with the account. Named when the user's spaces are known,
// so a forgotten one does not disappear unnoticed; said in general until then.
const SpacesDeletedWith = ({
  spaces,
}: {
  spaces: { id: string; title: string; memberCount: number }[] | undefined;
}) => {
  if (!spaces) return <li>A space where you are the only member is deleted, with its memos.</li>;

  const alone = spaces.filter(({ memberCount }) => memberCount === 1);
  if (alone.length === 0) return null;

  return (
    <li>
      {alone.length === 1 ? 'This space, where you are the only member, is' : 'These spaces, where you are the only member, are'}{' '}
      deleted with your account, with their memos:{' '}
      <span className="font-medium text-foreground">{alone.map(({ title }) => title).join(', ')}</span>.
    </li>
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
