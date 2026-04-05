import { router } from '../../trpc';
import { list, markAsArchived, markAllAsArchived, deleteNotification } from './notifications-procedures';

export const notificationsRouter = router({
  list,
  markAsArchived,
  markAllAsArchived,
  delete: deleteNotification,
});
