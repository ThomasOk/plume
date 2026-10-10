import { Button } from '@repo/ui/components/button';
import { env } from '@/env';
import { sounds } from '@/lib/sounds';

// The server mounts its routes at its root, beside `/api/auth`.
const exportUrl = new URL('/api/export', env.PUBLIC_SERVER_URL).href;

// A link, not a fetch: the browser downloads the archive itself, with the session cookie a
// top-level navigation carries, and stays on the page because the response is an attachment.
export const ExportSection = () => (
  <section className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold">Export</h2>
      <p className="text-sm text-muted-foreground">
        Download every memo you wrote, personal and in your spaces, as Markdown in a zip.
        Each memo lists its attachments by name; the attachments themselves and your
        comments are not included.
      </p>
    </div>
    <Button asChild variant="outline">
      <a href={exportUrl} onClick={sounds.click}>
        Export memos
      </a>
    </Button>
  </section>
);
