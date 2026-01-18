import { memo } from '@repo/db/schema';
import { desc, eq, and } from '@repo/db';
import { protectedProcedure, publicProcedure } from '../../trpc';
import {
  createMemoSchema,
  updateMemoSchema,
  deleteMemoSchema,
} from './schemas';
import { nanoid } from 'nanoid';

export const list = protectedProcedure.query(async ({ ctx }) => {
  const memos = await ctx.db.query.memo.findMany({
    where: eq(memo.userId, ctx.session.user.id),
    orderBy: [desc(memo.createdAt)],
  });

  return memos;
});

export const listPublic = publicProcedure.query(async ({ ctx }) => {
  const memos = await ctx.db.query.memo.findMany({
    orderBy: [desc(memo.createdAt)],
  });

  return memos;
});

export const create = protectedProcedure
  .input(createMemoSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      const now = new Date();

      const [newMemo] = await ctx.db
        .insert(memo)
        .values({
          id: nanoid(),
          userId: ctx.session.user.id,
          content: input.content,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return newMemo;
    } catch (error) {
      console.error('Failed to create memo:', error);
      throw new Error('Unable to save memo. Please try again.');
    }
  });

export const update = protectedProcedure
  .input(updateMemoSchema)
  .mutation(async ({ ctx, input }) => {
    //throw new Error('test update error');
    try {
      const [updatedMemo] = await ctx.db
        .update(memo)
        .set({
          content: input.content,
          updatedAt: new Date(),
        })
        .where(and(eq(memo.id, input.id), eq(memo.userId, ctx.session.user.id)))
        .returning();

      if (!updatedMemo) {
        throw new Error(
          'Memo not found or you do not have permission to update it',
        );
      }

      return updatedMemo;
    } catch (error) {
      console.error('Failed to update memo:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Unable to update memo');
    }
  });

export const deleteMemo = protectedProcedure
  .input(deleteMemoSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      const result = await ctx.db
        .delete(memo)
        .where(and(eq(memo.id, input.id), eq(memo.userId, ctx.session.user.id)))
        .returning();

      if (result.length === 0) {
        throw new Error(
          'Memo not found or you do not have permission to delete it',
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete memo:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Unable to delete memo');
    }
  });
