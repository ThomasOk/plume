import { router } from '../../trpc';
import { get, update } from './preferences-procedures';

export const preferencesRouter = router({
  get,
  update,
});
