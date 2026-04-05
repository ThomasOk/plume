import { router } from '../../trpc';
import {
  list,
  getById,
  create,
  update,
  deleteMemo,
  listPublic,
  listComments,
  stats,
  tags,
  publicTags,
} from './memos-procedures';

export const memosRouter = router({
  list,
  getById,
  listPublic,
  listComments,
  create,
  update,
  delete: deleteMemo, // delete is a reserved word
  stats,
  tags,
  publicTags,
});
