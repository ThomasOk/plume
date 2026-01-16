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
  });

export const update = protectedProcedure
  .input(updateMemoSchema)
  .mutation(async ({ ctx, input }) => {
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
  });

export const deleteMemo = protectedProcedure
  .input(deleteMemoSchema)
  .mutation(async ({ ctx, input }) => {
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
  });
