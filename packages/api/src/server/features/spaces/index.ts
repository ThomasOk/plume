import { router } from '../../trpc';
import { create, get, list } from './spaces-procedures';

export const spacesRouter = router({
  create,
  list,
  get,
});

export { spaceProcedure } from './space-procedure';
export type { SpaceMembership } from './spaces-service';
