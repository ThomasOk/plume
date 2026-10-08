import { desc, eq, and, isNull, sql, inArray, ne, or } from '@repo/db';
import { memo, user, attachment, spaceMember } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';
import type {
  createMemoSchema,
  updateMemoSchema,
  deleteMemoSchema,
  listMemosSchema,
  listCommentsSchema,
  getByIdSchema,
  moveSpaceMemoSchema,
  moveMemoSchema,
} from './memos-schemas';
import type { StorageService } from '../../shared/storage';
import type { DatabaseInstance } from '@repo/db/client';
import type { z } from 'zod';
import { COMMENT_CREATED } from '../../events/domain-events';
import { recordEvent } from '../../events/outbox';
import { MemoNotFoundError, InsufficientPermissionsError } from '../../shared/errors';
import { assertMay, mayDeleteMemo, mayEditMemo, type SpaceMembership } from '../spaces';
import { memoScopeCondition, readableMemoCondition, type MemoScope } from './memo-scope';
import { extractTagsFromContent, buildFilterConditions, formatAuthor } from './memos-utils';

type CreateMemoInput = z.infer<typeof createMemoSchema>;
type UpdateMemoInput = z.infer<typeof updateMemoSchema>;
type DeleteMemoInput = z.infer<typeof deleteMemoSchema>;
type ListMemosInput = z.infer<typeof listMemosSchema>;
type ListCommentsInput = z.infer<typeof listCommentsSchema>;
type GetByIdInput = z.infer<typeof getByIdSchema>;
// Into a space names only the memo; out of one names the new visibility as well.
type MoveMemoInput = z.infer<typeof moveSpaceMemoSchema> | z.infer<typeof moveMemoSchema>;

type ParentMemo = Pick<typeof memo.$inferSelect, 'id' | 'parentId' | 'visibility' | 'spaceId'>;

export async function getMemoById(db: DatabaseInstance, storage: StorageService, readerId: string | null, input: GetByIdInput) {
  const [row] = await db
    .select({
      id: memo.id,
      userId: memo.userId,
      parentId: memo.parentId,
      content: memo.content,
      tags: memo.tags,
      visibility: memo.visibility,
      spaceId: memo.spaceId,
      createdAt: memo.createdAt,
      updatedAt: memo.updatedAt,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(memo)
    .leftJoin(user, eq(memo.userId, user.id))
    .where(and(eq(memo.id, input.id), readableMemoCondition(readerId)))
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
      spaceId: memo.spaceId,
      createdAt: memo.createdAt,
      updatedAt: memo.updatedAt,
      // Scope-free by construction: it counts the comments of a memo the scope has
      // already admitted, and a comment's audience is its parent's.
      commentCount: sql<number>`(SELECT COUNT(*)::int FROM memo AS comments WHERE comments.parent_id = memo.id)`.as('comment_count'),
      authorName: user.name,
      authorImage: user.image,
    })
    .from(memo)
    // The author is part of every list, not only a space's: in a space it is who wrote
    // what, and one row shape for every scope keeps the views interchangeable.
    .leftJoin(user, eq(memo.userId, user.id))
    .where(and(memoScopeCondition(scope), isNull(memo.parentId), ...buildFilterConditions(input)))
    .orderBy(desc(memo.createdAt));

  const attachmentsByMemoId = await fetchAttachmentsForMemos(db, storage, memos.map((m) => m.id));

  return memos.map(({ authorName, authorImage, ...memoData }) => ({
    ...memoData,
    author: formatAuthor(authorName, authorImage),
    attachments: attachmentsByMemoId.get(memoData.id) ?? [],
  }));
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
      spaceId: memo.spaceId,
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

// The one place a root memo's visibility is reconciled with where it sits (ADR 0003): in a
// space, its visibility is `space` and nothing else; out of one, it is anything but. The
// database refuses the other combinations as a constraint violation; refusing here turns
// that into a plain answer. Creating, editing and moving all ask this, each naming the
// space the memo ends up in — or none.
const placementIn = (spaceId: string | null, visibility: CreateMemoInput['visibility']) => {
  if (spaceId !== null) {
    if (visibility !== undefined && visibility !== 'space') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'A memo in a space is neither private nor public: move it out instead',
      });
    }
    return { visibility: 'space' as const, spaceId };
  }
  // Writing into a space goes through the space's own procedure, which has resolved the
  // membership; a path that names no space cannot produce a `space` memo.
  if (visibility === 'space') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A memo cannot be written into a space without naming the space',
    });
  }
  return { visibility, spaceId: null };
};

/**
 * Where a write puts a memo: among the author's personal memos, or into a space. A space is
 * named by the membership `spaceProcedure` resolved, never by a bare identifier, so the
 * write can ask the role matrix whether that member may write there.
 */
export type MemoDestination = { kind: 'personal' } | { kind: 'space'; membership: SpaceMembership };

// The space a write puts a memo in, if any — once the member's role allows writing there.
const spaceIdOf = (destination: MemoDestination) => {
  if (destination.kind === 'personal') return null;
  assertMay(destination.membership, 'writeMemo');
  return destination.membership.spaceId;
};

// `authorId` and `destination` are two different facts, and a write needs both: who signs
// the memo, and where it goes. A space names no author.
export async function createMemo(db: DatabaseInstance, authorId: string, destination: MemoDestination, input: CreateMemoInput) {

  const now = new Date();
  const tags = extractTagsFromContent(input.content);

  // The comment insert and its outbox event commit together: both, or neither. The producer
  // announces a fact (`comment.created`) and knows nothing about its consequences — no
  // notification call here. It records unconditionally for any comment, even on one's own
  // memo; the "don't notify yourself" policy now lives in the consumer, not the producer.
  return db.transaction(async (tx) => {
    let parent: ParentMemo | undefined;
    if (input.parentId) {
      // Locked until the comment is in: a move of the parent waits for it, then sees it,
      // and a comment written after a move copies the parent's new place, not its old one.
      const [found] = await tx
        .select({ id: memo.id, parentId: memo.parentId, visibility: memo.visibility, spaceId: memo.spaceId })
        .from(memo)
        .where(and(eq(memo.id, input.parentId), readableMemoCondition(authorId)))
        .limit(1)
        .for('share');

      // You may only comment on a memo you may read, and a memo you may not read answers
      // like one that does not exist.
      if (!found) throw new MemoNotFoundError();
      if (found.parentId !== null) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot comment on a comment' });

      parent = found;
    }

    // A comment has no audience of its own: it takes its parent's, space included. Copying
    // the visibility alone would make the first comment on a space memo `space` with no
    // space, which the equivalence constraint refuses.
    const placement = parent
      ? { visibility: parent.visibility, spaceId: parent.spaceId }
      : placementIn(spaceIdOf(destination), input.visibility);

    const [created] = await tx
      .insert(memo)
      .values({
        id: nanoid(),
        userId: authorId,
        parentId: input.parentId ?? null,
        content: input.content,
        tags,
        ...placement,
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
}

export async function listMemoComments(db: DatabaseInstance, storage: StorageService, readerId: string | null, input: ListCommentsInput) {
  const [parent] = await db
    .select({ id: memo.id })
    .from(memo)
    .where(and(eq(memo.id, input.memoId), isNull(memo.parentId), readableMemoCondition(readerId)))
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
      spaceId: memo.spaceId,
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

/**
 * One memo a user is about to act on, with the facts the space policy decides from: whether
 * they wrote it, and their role in its space. The role is resolved in the same query, as
 * readability is (ADR 0004): a link to a memo carries the memo, not its space.
 *
 * A memo the user cannot read answers like a missing one.
 */
async function findMemoForActor(db: DatabaseInstance, userId: string, id: string) {
  const [row] = await db
    .select({ id: memo.id, userId: memo.userId, spaceId: memo.spaceId, role: spaceMember.role })
    .from(memo)
    .leftJoin(
      spaceMember,
      and(eq(spaceMember.spaceId, memo.spaceId), eq(spaceMember.userId, userId)),
    )
    .where(and(eq(memo.id, id), readableMemoCondition(userId)))
    .limit(1);

  if (!row) throw new MemoNotFoundError();

  const { role, ...existing } = row;
  return { ...existing, actor: { isAuthor: row.userId === userId, role } };
}

export async function updateMemo(db: DatabaseInstance, userId: string, input: UpdateMemoInput) {
  const existing = await findMemoForActor(db, userId, input.id);

  // Nobody edits another's memo, in a space or out of it, admin included: the memo would
  // keep its author's byline over words they did not write.
  if (!mayEditMemo(existing.actor)) throw new InsufficientPermissionsError();

  // An edit leaves a memo where it is: moving it into or out of a space is its own
  // operation, not a side effect of changing the visibility.
  const { visibility } = placementIn(existing.spaceId, input.visibility);

  const tags = extractTagsFromContent(input.content);
  const [updatedMemo] = await db
    .update(memo)
    .set({ content: input.content, tags, visibility, updatedAt: new Date() })
    .where(eq(memo.id, input.id))
    .returning();

  if (!updatedMemo) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Unable to update memo' });

  return updatedMemo;
}

export async function deleteMemo(db: DatabaseInstance, userId: string, input: DeleteMemoInput) {
  const existing = await findMemoForActor(db, userId, input.id);

  // An admin may delete another member's memo or comment in their space: that is moderation.
  if (!mayDeleteMemo(existing.actor)) throw new InsufficientPermissionsError();

  await db.delete(memo).where(eq(memo.id, input.id));

  return { success: true };
}

// Moving sets the visibility and the space together, on the memo and on its comments, in
// one statement: the equivalence constraint is checked per row, and no row ever passes
// through a state where one field has changed and the other has not (ADR 0003).
//
// It leaves `updatedAt` alone: a move changes who reads the memo, not what was written.
export async function moveMemo(db: DatabaseInstance, authorId: string, destination: MemoDestination, input: MoveMemoInput) {
  return db.transaction(async (tx) => {
    // Locked against a comment being written while the memo moves: either the comment
    // lands first and is counted below, or it waits and copies the memo's new place.
    const [existing] = await tx
      .select({ id: memo.id, userId: memo.userId, parentId: memo.parentId, spaceId: memo.spaceId })
      .from(memo)
      .where(and(eq(memo.id, input.id), readableMemoCondition(authorId)))
      .limit(1)
      .for('update');

    // Only the author moves a memo. An admin may delete another member's memo but never
    // relocate it: deleting is moderation, moving changes someone else's work under their
    // byline.
    if (!existing) throw new MemoNotFoundError();
    if (existing.userId !== authorId) throw new InsufficientPermissionsError();

    if (existing.parentId !== null) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'A comment moves with its memo, not on its own' });
    }

    const placement = placementIn(spaceIdOf(destination), 'visibility' in input ? input.visibility : undefined);

    // A move goes somewhere else. Between private and public, a personal memo stays where it
    // is, and that is an edit: one way to change a visibility, not two.
    if (placement.spaceId === existing.spaceId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'The memo is already there' });
    }

    // A comment has no audience of its own, so it moves with its memo. Someone else's
    // comment was written for the memo's audience as it stood: moving it would put their
    // words before readers they did not write for, or out of their own reach, without
    // asking them — whichever way the memo goes (ADR 0003).
    const [othersComment] = await tx
      .select({ id: memo.id })
      .from(memo)
      .where(and(eq(memo.parentId, existing.id), ne(memo.userId, authorId)))
      .limit(1);
    if (othersComment) {
      throw new TRPCError({ code: 'CONFLICT', message: 'A memo others have commented on cannot be moved' });
    }

    await tx
      .update(memo)
      .set(placement)
      .where(or(eq(memo.id, existing.id), eq(memo.parentId, existing.id)));

    return { success: true };
  });
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
