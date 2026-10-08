import { router } from '../../trpc';
import { deleteProcedure } from './account-procedures';

export const accountRouter = router({
  delete: deleteProcedure,
});
