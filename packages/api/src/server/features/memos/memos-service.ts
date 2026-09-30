import { desc, eq, and, isNull, sql, inArray } from '@repo/db';
import { memo, user, attachment } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';
import type {
  createMemoSchema,
  updateMemoSchema,
  deleteMemoSchema,
  listMemosSchema,
  listCommentsSchema,
  getByIdSchema,
} from './memos-schemas';
import type { StorageService } from '../../shared/storage';
import type { DatabaseInstance } from '@repo/db/client';
import type { z } from 'zod';
import { COMMENT_CREATED } from '../../events/domain-events';
import { recordEvent } from '../../events/outbox';
import { MemoNotFoundError, InsufficientPermissionsError } from '../../shared/errors';
import { memoScopeCondition, readableMemoCondition, type MemoScope } from './memo-scope';
import { extractTagsFromContent, buildFilterConditions, formatAuthor } from './memos-utils';

type CreateMemoInput = z.infer<typeof createMemoSchema>;
type UpdateMemoInput = z.infer<typeof updateMemoSchema>;
type DeleteMemoInput = z.infer<typeof deleteMemoSchema>;
type ListMemosInput = z.infer<typeof listMemosSchema>;
type ListCommentsInput = z.infer<typeof listCommentsSchema>;
type GetByIdInput = z.infer<typeof getByIdSchema>;

type ParentMemo = Pick<typeof memo.$inferSelect, 'id' | 'parentId' | 'visibility'>;

export async function getMemoById(db: DatabaseInstance, storage: StorageService, scope: MemoScope | null, input: GetByIdInput) {
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
    .where(and(eq(memo.id, input.id), readableMemoCondition(scope)))
    .limit(1);

  // An unreadable memo answers exactly like a missing one, so an identifier cannot be
  // probed to learn that it exists.
  if (!row) throw new MemoNotFoundError();

  const { authorName, authorImage, ...memoData } = row;
  const attachmentsByMemoId = await fetchAttachmentsForMemos(db, storage, [memoData.id]);
  return {
    ...memoData,
    author: formatAuthor(authorName, authorImage),
    attachments: attachmentsByMemoId.get(memoData.id) ?? [],
  };
}

async function fetchAttachmentsForMemos(
  db: DatabaseInstance,
  storage: StorageService,
  memoIds: string[],
) {
  if (memoIds.length === 0) return new Map<string, (typeof attachment.$inferSelect & { url: string })[]>();

  const rows = await db
    .select()
    .from(attachment)
    .where(and(inArray(attachment.memoId, memoIds), eq(attachment.status, 'active')))
    .orderBy(desc(attachment.createdAt));

  const byMemoId = new Map<string, (typeof attachment.$inferSelect & { url: string })[]>();
  for (const row of rows) {
    if (!row.memoId) continue;
    const list = byMemoId.get(row.memoId) ?? [];
    list.push({ ...row, url: storage.getPublicUrl(row.storageKey) });
    byMemoId.set(row.memoId, list);
  }
  return byMemoId;
}

export async function listMemos(db: DatabaseInstance, storage: StorageService, scope: MemoScope, input: ListMemosInput) {
  const memos = await db
    .select({
      id: memo.id,
      userId: memo.userId,
      parentId: memo.parentId,
      content: memo.content,
      tags: memo.tags,
      visibility: memo.visibility,
      createdAt: memo.createdAt,
      updatedAt: memo.updatedAt,
      // Scope-free by construction: it counts the comments of a memo the scope has
      // already admitted, and a comment's audience is its parent's.
      commentCount: sql<number>`(SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id)`.as('comment_count'),
    })
    .from(memo)
    .where(and(memoScopeCondition(scope), isNull(memo.parentId), ...buildFilterConditions(input)))
    .orderBy(desc(memo.createdAt));

  const attachmentsByMemoId = await fetchAttachmentsForMemos(db, storage, memos.map((m) => m.id));

  return memos.map((m) => ({ ...m, attachments: attachmentsByMemoId.get(m.id) ?? [] }));
}

export async function listPublicMemos(db: DatabaseInstance, storage: StorageService, input: ListMemosInput) {
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
      // Scope-free by construction: it counts the comments of a memo the scope has
      // already admitted, and a comment's audience is its parent's.
      commentCount: sql<number>`(SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id)`.as('comment_count'),
      authorName: user.name,
      authorImage: user.image,
    })
    .from(memo)
    .leftJoin(user, eq(memo.userId, user.id))
    .where(and(eq(memo.visibility, 'public'), isNull(memo.parentId), ...buildFilterConditions(input)))
    .orderBy(desc(memo.createdAt));

  const attachmentsByMemoId = await fetchAttachmentsForMemos(db, storage, rows.map((r) => r.id));

  return rows.map(({ authorName, authorImage, ...memoData }) => ({
    ...memoData,
    author: formatAuthor(authorName, authorImage),
    attachments: attachmentsByMemoId.get(memoData.id) ?? [],
  }));
}

// A memo may be `space`-visible only together with the space it goes into, and
// no write path can name one yet: nothing resolves whether the author is a member. Refusing
// here turns what the database would reject as a constraint violation into a plain refusal.
const rejectSpaceVisibility = (visibility: CreateMemoInput['visibility']) => {
  if (visibility === 'space') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A memo cannot be written into a space yet',
    });
  }
};

// `authorId` and `scope` are two different facts, and a write needs both: who signs the
// memo, and whose memos it may be a comment on. A space scope names no author.
export async function createMemo(db: DatabaseInstance, authorId: string, scope: MemoScope, input: CreateMemoInput) {
  rejectSpaceVisibility(input.visibility);

  const now = new Date();
  const tags = extractTagsFromContent(input.content);

  let parent: ParentMemo | undefined;
  if (input.parentId) {
    const [found] = await db
      .select({ id: memo.id, parentId: memo.parentId, visibility: memo.visibility })
      .from(memo)
      .where(and(eq(memo.id, input.parentId), readableMemoCondition(scope)))
      .limit(1);

    // You may only comment on a memo you may read, and a memo you may not read answers
    // like one that does not exist.
    if (!found) throw new MemoNotFoundError();
    if (found.parentId !== null) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot comment on a comment' });

    parent = found;
  }

  // The comment insert and its outbox event commit together: both, or neither. The producer
  // announces a fact (`comment.created`) and knows nothing about its consequences — no
  // notification call here. It records unconditionally for any comment, even on one's own
  // memo; the "don't notify yourself" policy now lives in the consumer, not the producer.
  const newMemo = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(memo)
      .values({
        id: nanoid(),
        userId: authorId,
        parentId: input.parentId ?? null,
        content: input.content,
        tags,
        // A comment shares its parent's visibility. It will have to copy the parent's
        // space too, or the first comment on a space memo breaks the equivalence.
        visibility: parent ? parent.visibility : input.visibility,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Unable to save memo' });

    if (parent) {
      await recordEvent(tx, {
        eventType: COMMENT_CREATED,
        payload: { commentId: created.id, parentMemoId: parent.id, authorId },
      });
    }

    return created;
  });

  return newMemo;
}

export async function listMemoComments(db: DatabaseInstance, storage: StorageService, scope: MemoScope | null, input: ListCommentsInput) {
  const [parent] = await db
    .select({ id: memo.id })
    .from(memo)
    .where(and(eq(memo.id, input.memoId), isNull(memo.parentId), readableMemoCondition(scope)))
    .limit(1);

  // Comments carry their parent's audience, so an unreadable parent answers like a
  // missing one rather than disclosing that it exists.
  if (!parent) throw new MemoNotFoundError();

  // The comments themselves take no scope: they carry no audience of their own, so the
  // parent's readability, resolved just above, is the whole answer for all of them.
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

  const attachmentsByMemoId = await fetchAttachmentsForMemos(db, storage, rows.map((r) => r.id));

  return rows.map(({ authorName, authorImage, ...memoData }) => ({
    ...memoData,
    author: formatAuthor(authorName, authorImage),
    attachments: attachmentsByMemoId.get(memoData.id) ?? [],
  }));
}

export async function updateMemo(db: DatabaseInstance, userId: string, input: UpdateMemoInput) {
  rejectSpaceVisibility(input.visibility);

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

export async function getMemoStats(db: DatabaseInstance, scope: MemoScope) {
  const rows = await db
    .select({
      date: sql`DATE(${memo.createdAt})`.as('date'),
      count: sql`COUNT(*)`.as('count'),
    })
    .from(memo)
    .where(and(memoScopeCondition(scope), isNull(memo.parentId)))
    .groupBy(sql`DATE(${memo.createdAt})`);

  return Object.fromEntries(rows.map((row) => [row.date as string, Number(row.count)]));
}

export async function getMemoTags(db: DatabaseInstance, scope: MemoScope) {
  const rows = await db
    .select({
      tag: sql<string>`unnest(${memo.tags})`.as('tag'),
      count: sql<number>`count(*)`.as('count'),
    })
    .from(memo)
    .where(and(memoScopeCondition(scope), isNull(memo.parentId)))
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
