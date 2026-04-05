import { router } from '../../trpc';
import { getUploadUrl, confirmUpload, list, deleteAttachment, listByMemo } from './attachments-procedures';

export const attachmentsRouter = router({
  getUploadUrl,
  confirmUpload,
  list,
  listByMemo,
  delete: deleteAttachment,
});
