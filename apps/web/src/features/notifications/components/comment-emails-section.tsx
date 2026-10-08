import { Label } from '@repo/ui/components/label';
import { Switch } from '@repo/ui/components/switch';
import { toast } from 'sonner';
import { usePreferences } from '../hooks/use-preferences';
import { useUpdatePreferences } from '../hooks/use-update-preferences';

export const CommentEmailsSection = () => {
  const { data: preferences } = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const onCheckedChange = (commentEmails: boolean) => {
    updatePreferences.mutate(
      { commentEmails },
      { onError: () => toast.error('Failed to save your preference') },
    );
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Email</h2>
        <p className="text-sm text-muted-foreground">
          You always see new comments in your notifications inside Plume.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="comment-emails">
          Email me when someone comments on my memos
        </Label>
        <Switch
          id="comment-emails"
          checked={preferences?.commentEmails ?? true}
          disabled={!preferences}
          onCheckedChange={onCheckedChange}
        />
      </div>
    </section>
  );
};
