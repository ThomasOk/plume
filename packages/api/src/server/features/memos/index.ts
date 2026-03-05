import { router } from '../../trpc';
import {
  list,
  create,
  update,
  deleteMemo,
  listPublic,
  stats,
  tags,
  publicTags,
} from './procedures';

export const memosRouter = router({
  list,
  listPublic,
  create,
  update,
  delete: deleteMemo, // delete is a reserved word
  stats,
  tags,
  publicTags,
});
