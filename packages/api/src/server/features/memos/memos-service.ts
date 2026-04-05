import { desc, eq, and, isNull, sql } from '@repo/db';
import type { DatabaseInstance } from '@repo/db/client';
import { memo, user } from '@repo/db/schema';
import { nanoid } from 'nanoid';
import { TRPCError } from '@trpc/server';
import { MemoNotFoundError, InsufficientPermissionsError } from '../../shared/errors';
import { createCommentNotification } from '../../shared/notifications';
import { extractTagsFromContent, buildFilterConditions, formatAuthor } from './memos-utils';
import type {
  createMemoSchema,
  updateMemoSchema,
  deleteMemoSchema,
  listMemosSchema,
  listCommentsSchema,
  getByIdSchema,
} from './memos-schemas';
import type { z } from 'zod';

type CreateMemoInput = z.infer<typeof createMemoSchema>;
type UpdateMemoInput = z.infer<typeof updateMemoSchema>;
type DeleteMemoInput = z.infer<typeof deleteMemoSchema>;
type ListMemosInput = z.infer<typeof listMemosSchema>;
type ListCommentsInput = z.infer<typeof listCommentsSchema>;
type GetByIdInput = z.infer<typeof getByIdSchema>;

type ParentMemo = Pick<typeof memo.$inferSelect, 'id' | 'parentId' | 'visibility' | 'userId'>;

export async function getMemoById(db: DatabaseInstance, sessionUserId: string | null, input: GetByIdInput) {
  const [row] = await db
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

  if (!row) throw new MemoNotFoundError();
  if (row.visibility === 'private' && sessionUserId !== row.userId) throw new MemoNotFoundError();

  const { authorName, authorImage, ...memoData } = row;
  return { ...memoData, author: formatAuthor(authorName, authorImage) };
}

export async function listMemos(db: DatabaseInstance, userId: string, input: ListMemosInput) {
  return db
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
    .where(and(eq(memo.userId, userId), isNull(memo.parentId), ...buildFilterConditions(input)))
    .orderBy(desc(memo.createdAt));
}

export async function listPublicMemos(db: DatabaseInstance, input: ListMemosInput) {
  const rows = await db
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
    .where(and(eq(memo.visibility, 'public'), isNull(memo.parentId), ...buildFilterConditions(input)))
    .orderBy(desc(memo.createdAt));

  return rows.map(({ authorName, authorImage, ...memoData }) => ({
    ...memoData,
    author: formatAuthor(authorName, authorImage),
  }));
}

export async function createMemo(db: DatabaseInstance, userId: string, input: CreateMemoInput) {
  const now = new Date();
  const tags = extractTagsFromContent(input.content);

  let parent: ParentMemo | undefined;
  if (input.parentId) {
    const [found] = await db
      .select({ id: memo.id, parentId: memo.parentId, visibility: memo.visibility, userId: memo.userId })
      .from(memo)
      .where(eq(memo.id, input.parentId))
      .limit(1);

    if (!found) throw new MemoNotFoundError();
    if (found.parentId !== null) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot comment on a comment' });
    if (found.visibility === 'private' && found.userId !== userId) throw new InsufficientPermissionsError();

    parent = found;
  }

  const [newMemo] = await db
    .insert(memo)
    .values({
      id: nanoid(),
      userId,
      parentId: input.parentId ?? null,
      content: input.content,
      tags,
      visibility: parent ? parent.visibility : input.visibility,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!newMemo) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Unable to save memo' });

  if (parent && parent.userId !== userId) {
    await createCommentNotification(db, userId, newMemo.id, parent.userId);
  }

  return newMemo;
}

export async function listMemoComments(db: DatabaseInstance, sessionUserId: string | null, input: ListCommentsInput) {
  const [parent] = await db
    .select({ id: memo.id, visibility: memo.visibility, userId: memo.userId })
    .from(memo)
    .where(and(eq(memo.id, input.memoId), isNull(memo.parentId)))
    .limit(1);

  if (!parent) throw new MemoNotFoundError();
  if (parent.visibility === 'private' && sessionUserId !== parent.userId) throw new MemoNotFoundError();

  const rows = await db
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
    author: formatAuthor(authorName, authorImage),
  }));
}

export async function updateMemo(db: DatabaseInstance, userId: string, input: UpdateMemoInput) {
  const [existing] = await db
    .select({ id: memo.id, userId: memo.userId })
    .from(memo)
    .where(eq(memo.id, input.id))
    .limit(1);

  if (!existing) throw new MemoNotFoundError();
  if (existing.userId !== userId) throw new InsufficientPermissionsError();

  const tags = extractTagsFromContent(input.content);
  const [updatedMemo] = await db
    .update(memo)
    .set({ content: input.content, tags, visibility: input.visibility, updatedAt: new Date() })
    .where(eq(memo.id, input.id))
    .returning();

  if (!updatedMemo) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Unable to update memo' });

  return updatedMemo;
}

export async function deleteMemo(db: DatabaseInstance, userId: string, input: DeleteMemoInput) {
  const [existing] = await db
    .select({ id: memo.id, userId: memo.userId })
    .from(memo)
    .where(eq(memo.id, input.id))
    .limit(1);

  if (!existing) throw new MemoNotFoundError();
  if (existing.userId !== userId) throw new InsufficientPermissionsError();

  await db.delete(memo).where(eq(memo.id, input.id));

  return { success: true };
}

export async function getMemoStats(db: DatabaseInstance, userId: string) {
  const rows = await db
    .select({
      date: sql`DATE(${memo.createdAt})`.as('date'),
      count: sql`COUNT(*)`.as('count'),
    })
    .from(memo)
    .where(and(eq(memo.userId, userId), isNull(memo.parentId)))
    .groupBy(sql`DATE(${memo.createdAt})`);

  return Object.fromEntries(rows.map((row) => [row.date as string, Number(row.count)]));
}

export async function getMemoTags(db: DatabaseInstance, userId: string) {
  const rows = await db
    .select({
      tag: sql<string>`unnest(${memo.tags})`.as('tag'),
      count: sql<number>`count(*)`.as('count'),
    })
    .from(memo)
    .where(and(eq(memo.userId, userId), isNull(memo.parentId)))
    .groupBy(sql`1`);

  return Object.fromEntries(rows.map((row) => [row.tag, Number(row.count)]));
}

export async function getPublicTags(db: DatabaseInstance) {
  const rows = await db
    .select({
      tag: sql<string>`unnest(${memo.tags})`.as('tag'),
      count: sql<number>`count(*)`.as('count'),
    })
    .from(memo)
    .where(and(eq(memo.visibility, 'public'), isNull(memo.parentId)))
    .groupBy(sql`1`);

  return Object.fromEntries(rows.map((row) => [row.tag, Number(row.count)]));
}
