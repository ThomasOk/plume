import { desc, eq, and } from '@repo/db';
import { notification, memo, user } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../trpc';
import { archiveNotificationSchema, deleteNotificationSchema } from './schemas';

export const list = protectedProcedure.query(async ({ ctx }) => {
  try {
    const sender = user;
    const comment = memo;

    const rows = await ctx.db
      .select({
        id: notification.id,
        type: notification.type,
        status: notification.status,
        createdAt: notification.createdAt,
        entityId: notification.entityId,
        senderName: sender.name,
        senderImage: sender.image,
        commentContent: comment.content,
        commentParentId: comment.parentId,
      })
      .from(notification)
      .innerJoin(sender, eq(notification.senderId, sender.id))
      .innerJoin(comment, eq(notification.entityId, comment.id))
      .where(eq(notification.receiverId, ctx.session.user.id))
      .orderBy(desc(notification.createdAt));

    return rows.map(({ senderName, senderImage, commentContent, commentParentId, ...notif }) => ({
      ...notif,
      sender: { name: senderName ?? 'Unknown', image: senderImage ?? null },
      comment: { content: commentContent, parentId: commentParentId },
    }));
  } catch (error) {
    console.error('Failed to list notifications:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to load notifications. Please try again.',
    });
  }
});

export const markAsArchived = protectedProcedure
  .input(archiveNotificationSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      const [updated] = await ctx.db
        .update(notification)
        .set({ status: 'ARCHIVED' })
        .where(
          and(
            eq(notification.id, input.id),
            eq(notification.receiverId, ctx.session.user.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      return updated;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('Failed to archive notification:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to archive notification. Please try again.',
      });
    }
  });

export const markAllAsArchived = protectedProcedure.mutation(async ({ ctx }) => {
  try {
    await ctx.db
      .update(notification)
      .set({ status: 'ARCHIVED' })
      .where(
        and(
          eq(notification.receiverId, ctx.session.user.id),
          eq(notification.status, 'UNREAD'),
        ),
      );

    return { success: true };
  } catch (error) {
    console.error('Failed to archive all notifications:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to archive notifications. Please try again.',
    });
  }
});

export const deleteNotification = protectedProcedure
  .input(deleteNotificationSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      const result = await ctx.db
        .delete(notification)
        .where(
          and(
            eq(notification.id, input.id),
            eq(notification.receiverId, ctx.session.user.id),
          ),
        )
        .returning();

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('Failed to delete notification:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to delete notification. Please try again.',
      });
    }
  });
