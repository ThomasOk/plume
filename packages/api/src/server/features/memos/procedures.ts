import { desc, eq, and, isNull, sql } from '@repo/db';
import { memo, user } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';
import { protectedProcedure, publicProcedure } from '../../trpc';
import {
  createMemoSchema,
  updateMemoSchema,
  deleteMemoSchema,
  listMemosSchema,
  listCommentsSchema,
  getByIdSchema,
} from './schemas';
import { extractTagsFromContent, buildFilterConditions } from './utils';

export const getById = publicProcedure
  .input(getByIdSchema)
  .query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select({
        id: memo.id,
        userId: memo.userId,
        parentId: memo.parentId,
        content: memo.content,
        tags: memo.tags,
        visibility: memo.visibility,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
        authorName: user.name,
        authorImage: user.image,
      })
      .from(memo)
      .leftJoin(user, eq(memo.userId, user.id))
      .where(eq(memo.id, input.id))
      .limit(1);

    if (!row) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Memo not found' });
    }

    if (row.visibility === 'private' && ctx.session?.user.id !== row.userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Memo not found' });
    }

    const { authorName, authorImage, ...memoData } = row;
    return {
      ...memoData,
      author: { name: authorName ?? 'Unknown', image: authorImage ?? null },
    };
  });

export const list = protectedProcedure
  .input(listMemosSchema)
  .query(async ({ ctx, input }) => {
    const conditions = [
      eq(memo.userId, ctx.session.user.id),
      isNull(memo.parentId),
      ...buildFilterConditions(input),
    ];

    return ctx.db
      .select({
        id: memo.id,
        userId: memo.userId,
        parentId: memo.parentId,
        content: memo.content,
        tags: memo.tags,
        visibility: memo.visibility,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
        commentCount: sql<number>`(SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id)`.as('comment_count'),
      })
      .from(memo)
      .where(and(...conditions))
      .orderBy(desc(memo.createdAt));
  });

export const listPublic = publicProcedure
  .input(listMemosSchema)
  .query(async ({ ctx, input }) => {
    const conditions = [
      eq(memo.visibility, 'public'),
      isNull(memo.parentId),
      ...buildFilterConditions(input),
    ];

    const rows = await ctx.db
      .select({
        id: memo.id,
        userId: memo.userId,
        parentId: memo.parentId,
        content: memo.content,
        tags: memo.tags,
        visibility: memo.visibility,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
        commentCount: sql<number>`(SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id)`.as('comment_count'),
        authorName: user.name,
        authorImage: user.image,
      })
      .from(memo)
      .leftJoin(user, eq(memo.userId, user.id))
      .where(and(...conditions))
      .orderBy(desc(memo.createdAt));

    return rows.map(({ authorName, authorImage, ...memoData }) => ({
      ...memoData,
      author: { name: authorName ?? 'Unknown', image: authorImage ?? null },
    }));
  });

export const create = protectedProcedure
  .input(createMemoSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      const now = new Date();
      const tags = extractTagsFromContent(input.content);

      // If parentId is provided, verify the parent memo exists and is accessible
      if (input.parentId) {
        const [parent] = await ctx.db
          .select({ id: memo.id, parentId: memo.parentId, visibility: memo.visibility, userId: memo.userId })
          .from(memo)
          .where(eq(memo.id, input.parentId))
          .limit(1);

        if (!parent) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent memo not found' });
        }

        // Enforce flat comments: cannot comment on a comment
        if (parent.parentId !== null) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot comment on a comment' });
        }

        // Cannot comment on a private memo unless you own it
        if (parent.visibility === 'private' && parent.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot comment on a private memo' });
        }
      }

      const [newMemo] = await ctx.db
        .insert(memo)
        .values({
          id: nanoid(),
          userId: ctx.session.user.id,
          parentId: input.parentId ?? null,
          content: input.content,
          tags: tags,
          visibility: input.visibility,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return newMemo!;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('Failed to create memo:', error);
      throw new Error('Unable to save memo. Please try again.');
    }
  });

export const listComments = publicProcedure
  .input(listCommentsSchema)
  .query(async ({ ctx, input }) => {
    const [parent] = await ctx.db
      .select({ id: memo.id, visibility: memo.visibility, userId: memo.userId })
      .from(memo)
      .where(and(eq(memo.id, input.memoId), isNull(memo.parentId)))
      .limit(1);

    if (!parent) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Memo not found' });
    }

    // Private memos: only the owner can see comments
    if (parent.visibility === 'private' && ctx.session?.user.id !== parent.userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Memo not found' });
    }

    const rows = await ctx.db
      .select({
        id: memo.id,
        userId: memo.userId,
        parentId: memo.parentId,
        content: memo.content,
        tags: memo.tags,
        visibility: memo.visibility,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
        authorName: user.name,
        authorImage: user.image,
      })
      .from(memo)
      .leftJoin(user, eq(memo.userId, user.id))
      .where(eq(memo.parentId, input.memoId))
      .orderBy(desc(memo.createdAt));

    return rows.map(({ authorName, authorImage, ...memoData }) => ({
      ...memoData,
      author: { name: authorName ?? 'Unknown', image: authorImage ?? null },
    }));
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
          visibility: input.visibility,
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
    .where(and(eq(memo.userId, ctx.session.user.id), isNull(memo.parentId)))
    .groupBy(sql`DATE(${memo.createdAt})`);

  return rows.reduce(
    (acc, row) => {
      acc[row.date as string] = Number(row.count);
      return acc;
    },
    {} as Record<string, number>,
  );
});

export const tags = protectedProcedure.query(async ({ ctx }) => {
  const rows = await ctx.db
    .select({
      tag: sql<string>`unnest(${memo.tags})`.as('tag'),
      count: sql<number>`count(*)`.as('count'),
    })
    .from(memo)
    .where(and(eq(memo.userId, ctx.session.user.id), isNull(memo.parentId)))
    .groupBy(sql`1`);

  return rows.reduce(
    (acc, row) => {
      acc[row.tag] = Number(row.count);
      return acc;
    },
    {} as Record<string, number>,
  );
});

export const publicTags = publicProcedure.query(async ({ ctx }) => {
  const rows = await ctx.db
    .select({
      tag: sql<string>`unnest(${memo.tags})`.as('tag'),
      count: sql<number>`count(*)`.as('count'),
    })
    .from(memo)
    .where(and(eq(memo.visibility, 'public'), isNull(memo.parentId)))
    .groupBy(sql`1`);

  return rows.reduce(
    (acc, row) => {
      acc[row.tag] = Number(row.count);
      return acc;
    },
    {} as Record<string, number>,
  );
});
