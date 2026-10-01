import { router } from '../../trpc';
import { create, deleteSpace, get, leave, list, members, rename } from './spaces-procedures';

export const spacesRouter = router({
  create,
  list,
  get,
  members,
  leave,
  rename,
  delete: deleteSpace, // delete is a reserved word
});

export { spaceProcedure } from './space-procedure';
export { assertMay, type SpaceMembership } from './spaces-service';
export { mayDeleteMemo, mayEditMemo } from './space-policy';
