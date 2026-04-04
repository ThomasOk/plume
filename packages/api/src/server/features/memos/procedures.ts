import { desc, eq, and, isNull, sql } from '@repo/db';
import { memo, user, notification } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';
import { protectedProcedure, publicProcedure } from '../../trpc';
import { MemoNotFoundError, InsufficientPermissionsError } from '../../lib/errors';
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
      throw new MemoNotFoundError();
    }

    if (row.visibility === 'private' && ctx.session?.user.id !== row.userId) {
      throw new MemoNotFoundError();
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
    const now = new Date();
    const tags = extractTagsFromContent(input.content);

    // If parentId is provided, verify the parent memo exists and is accessible
    let parent: { id: string; parentId: string | null; visibility: 'public' | 'private'; userId: string } | undefined;
    if (input.parentId) {
      const [found] = await ctx.db
        .select({ id: memo.id, parentId: memo.parentId, visibility: memo.visibility, userId: memo.userId })
        .from(memo)
        .where(eq(memo.id, input.parentId))
        .limit(1);

      if (!found) {
        throw new MemoNotFoundError();
      }

      // Enforce flat comments: cannot comment on a comment
      if (found.parentId !== null) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot comment on a comment' });
      }

      // Cannot comment on a private memo unless you own it
      if (found.visibility === 'private' && found.userId !== ctx.session.user.id) {
        throw new InsufficientPermissionsError();
      }

      parent = found;
    }

    const [newMemo] = await ctx.db
      .insert(memo)
      .values({
        id: nanoid(),
        userId: ctx.session.user.id,
        parentId: input.parentId ?? null,
        content: input.content,
        tags: tags,
        // Comments inherit the parent memo's visibility
        visibility: parent ? parent.visibility : input.visibility,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!newMemo) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Unable to save memo' });
    }

    // Notify the parent memo owner when someone else comments on their memo
    if (input.parentId && parent && parent.userId !== ctx.session.user.id) {
      await ctx.db.insert(notification).values({
        id: nanoid(),
        senderId: ctx.session.user.id,
        receiverId: parent.userId,
        type: 'MEMO_COMMENT',
        entityId: newMemo.id,
        status: 'UNREAD',
        createdAt: now,
      });
    }

    return newMemo;
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
      throw new MemoNotFoundError();
    }

    // Private memos: only the owner can see comments
    if (parent.visibility === 'private' && ctx.session?.user.id !== parent.userId) {
      throw new MemoNotFoundError();
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
    const [existing] = await ctx.db
      .select({ id: memo.id, userId: memo.userId })
      .from(memo)
      .where(eq(memo.id, input.id))
      .limit(1);

    if (!existing) {
      throw new MemoNotFoundError();
    }

    if (existing.userId !== ctx.session.user.id) {
      throw new InsufficientPermissionsError();
    }

    const tags = extractTagsFromContent(input.content);
    const [updatedMemo] = await ctx.db
      .update(memo)
      .set({
        content: input.content,
        tags: tags,
        visibility: input.visibility,
        updatedAt: new Date(),
      })
      .where(eq(memo.id, input.id))
      .returning();

    if (!updatedMemo) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Unable to update memo' });
    }

    return updatedMemo;
  });

export const deleteMemo = protectedProcedure
  .input(deleteMemoSchema)
  .mutation(async ({ ctx, input }) => {
    const [existing] = await ctx.db
      .select({ id: memo.id, userId: memo.userId })
      .from(memo)
      .where(eq(memo.id, input.id))
      .limit(1);

    if (!existing) {
      throw new MemoNotFoundError();
    }

    if (existing.userId !== ctx.session.user.id) {
      throw new InsufficientPermissionsError();
    }

    await ctx.db.delete(memo).where(eq(memo.id, input.id));

    return { success: true };
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
