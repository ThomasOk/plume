import { router } from '../../trpc';
import {
  list,
  getById,
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
  getById,
  listPublic,
  create,
  update,
  delete: deleteMemo, // delete is a reserved word
  stats,
  tags,
  publicTags,
});
