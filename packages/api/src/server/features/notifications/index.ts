import { router } from '../../trpc';
import { list, markAsArchived, markAllAsArchived, deleteNotification } from './procedures';

export const notificationsRouter = router({
  list,
  markAsArchived,
  markAllAsArchived,
  delete: deleteNotification,
});
