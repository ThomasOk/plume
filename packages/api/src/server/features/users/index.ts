import { router } from '../../trpc';
import { search } from './users-procedures';

export const usersRouter = router({
  search,
});
