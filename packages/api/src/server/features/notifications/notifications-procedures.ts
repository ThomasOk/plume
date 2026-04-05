import { protectedProcedure } from '../../trpc';
import { archiveNotificationSchema, deleteNotificationSchema } from './notifications-schemas';
import {
  listNotifications,
  markAsArchived as markAsArchivedService,
  markAllAsArchived as markAllAsArchivedService,
  deleteNotification as deleteNotificationService,
} from './notifications-service';

export const list = protectedProcedure
  .query(({ ctx }) => listNotifications(ctx.db, ctx.session.user.id));

export const markAsArchived = protectedProcedure
  .input(archiveNotificationSchema)
  .mutation(({ ctx, input }) => markAsArchivedService(ctx.db, ctx.session.user.id, input));

export const markAllAsArchived = protectedProcedure
  .mutation(({ ctx }) => markAllAsArchivedService(ctx.db, ctx.session.user.id));

export const deleteNotification = protectedProcedure
  .input(deleteNotificationSchema)
  .mutation(({ ctx, input }) => deleteNotificationService(ctx.db, ctx.session.user.id, input));
