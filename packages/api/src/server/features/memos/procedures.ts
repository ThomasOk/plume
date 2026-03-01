import { desc, eq, and, sql, ilike } from '@repo/db';
import { memo } from '@repo/db/schema';
import { nanoid } from 'nanoid';
import { protectedProcedure, publicProcedure } from '../../trpc';
import {
  createMemoSchema,
  updateMemoSchema,
  deleteMemoSchema,
  listMemosSchema,
} from './schemas';
import { extractTagsFromContent } from './utils';

export const list = protectedProcedure
  .input(listMemosSchema)
  .query(async ({ ctx, input }) => {
    // conditions before findMany
    const conditions = [eq(memo.userId, ctx.session.user.id)];

    if (input.date) {
      conditions.push(sql`DATE(${memo.createdAt}) = ${input.date}`);
    }

    if (input.tag) {
      conditions.push(sql`${memo.tags} @> ARRAY[${input.tag}]`);
    }

    if (input.query) {
      conditions.push(ilike(memo.content, `%${input.query}%`));
    }

    const memos = await ctx.db.query.memo.findMany({
      where: and(...conditions),
      orderBy: [desc(memo.createdAt)],
    });

    return memos;
  });

export const listPublic = publicProcedure
  .input(listMemosSchema)
  .query(async ({ ctx, input }) => {
    const conditions = [];

    if (input.date) {
      conditions.push(sql`DATE(${memo.createdAt}) = ${input.date}`);
    }

    if (input.tag) {
      conditions.push(sql`${memo.tags} @> ARRAY[${input.tag}]`);
    }

    if (input.query) {
      conditions.push(ilike(memo.content, `%${input.query}%`));
    }

    const memos = await ctx.db.query.memo.findMany({
      where: and(...conditions),
      orderBy: [desc(memo.createdAt)],
    });

    return memos;
  });

export const create = protectedProcedure
  .input(createMemoSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      const now = new Date();
      const tags = extractTagsFromContent(input.content);
      const [newMemo] = await ctx.db
        .insert(memo)
        .values({
          id: nanoid(),
          userId: ctx.session.user.id,
          content: input.content,
          tags: tags,
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
      const tags = extractTagsFromContent(input.content);
      const [updatedMemo] = await ctx.db
        .update(memo)
        .set({
          content: input.content,
          tags: tags,
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

export const stats = protectedProcedure.query(async ({ ctx }) => {
  const rows = await ctx.db
    .select({
      date: sql`DATE(${memo.createdAt})`.as('date'),
      count: sql`COUNT(*)`.as('count'),
    })
    .from(memo)
    .where(eq(memo.userId, ctx.session.user.id))
    .groupBy(sql`DATE(${memo.createdAt})`);

  return rows.reduce(
    (acc, row) => {
      acc[row.date as string] = Number(row.count);
      return acc;
    },
    {} as Record<string, number>,
  );
});
