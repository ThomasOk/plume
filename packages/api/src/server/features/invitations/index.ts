import { router } from '../../trpc';
import { accept, create, list, preview, revoke } from './invitations-procedures';

export const invitationsRouter = router({
  create,
  list,
  revoke,
  preview,
  accept,
});
