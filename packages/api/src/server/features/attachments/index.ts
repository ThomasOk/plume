import { router } from '../../trpc';
import { getUploadUrl, confirmUpload, list, deleteAttachment, listByMemo } from './procedures';

export const attachmentsRouter = router({
  getUploadUrl,
  confirmUpload,
  list,
  listByMemo,
  delete: deleteAttachment,
});
