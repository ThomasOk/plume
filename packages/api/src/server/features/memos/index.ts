import { router } from '../../trpc';
import {
  list,
  getById,
  create,
  update,
  deleteMemo,
  move,
  pin,
  unpin,
  listPublic,
  listComments,
  stats,
  tags,
  publicTags,
  space,
} from './memos-procedures';

export const memosRouter = router({
  list,
  getById,
  listPublic,
  listComments,
  create,
  update,
  delete: deleteMemo, // delete is a reserved word
  move,
  pin,
  unpin,
  stats,
  tags,
  publicTags,
  space,
});
