import { router } from '../../trpc';
import { getUploadUrl, confirmUpload, list, deleteAttachment } from './procedures';

export const attachmentsRouter = router({
  getUploadUrl,
  confirmUpload,
  list,
  delete: deleteAttachment,
});
