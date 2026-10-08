import { and, asc, eq, isNull } from '@repo/db';
import { attachment, memo, space } from '@repo/db/schema';
import { strToU8, zipSync, type Zippable } from 'fflate';
import { stringify } from 'yaml';
import type { DatabaseInstance } from '@repo/db/client';

// Letters that NFD leaves whole, because they are not a base letter plus an accent.
const UNDECOMPOSED_LETTERS: Record<string, string> = {
  ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', đ: 'd', ð: 'd', ł: 'l', þ: 'th', ı: 'i',
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[ßæœøđðłþı]/g, (letter) => UNDECOMPOSED_LETTERS[letter]!)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const MAX_SLUG_LENGTH = 50;

// The words of a Markdown line, without its syntax: a link or an image keeps its text, and
// the leading marker of a heading, quote or list item goes. Emphasis, code ticks and every
// other symbol fall out with the slug's own punctuation folding.
const stripMarkdown = (line: string) =>
  line
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:(?:#{1,6}|>|[-*+]|\d+[.)])\s+)+(?:\[[ xX]\]\s+)?/, '');

const memoSlug = (content: string) => {
  const firstLine = content.split('\n').find((line) => line.trim() !== '') ?? '';
  const slug = slugify(stripMarkdown(firstLine)).slice(0, MAX_SLUG_LENGTH).replace(/-$/, '');
  return slug || 'memo';
};

/** `name`, or `name-2`, `name-3`… — the first one not already in `taken`, which it joins. */
const claimUnique = (taken: Set<string>, name: string) => {
  let candidate = name;
  for (let n = 2; taken.has(candidate); n++) candidate = `${name}-${n}`;
  taken.add(candidate);
  return candidate;
};

/**
 * Every memo the user is the author of — personal or in a space, never a comment — as a
 * zip of Markdown files, one folder per scope.
 */
export const buildMemoArchive = async (
  db: DatabaseInstance,
  userId: string,
): Promise<Uint8Array> => {
  // By author across every scope rather than through a `MemoScope`, including spaces the
  // user has since left: ADR 0004, "The export reads by author".
  const authored = and(eq(memo.userId, userId), isNull(memo.parentId));

  // Oldest first, so that the older of two memos (or spaces) keeps the unsuffixed name and
  // exporting twice gives the same names.
  const memos = await db
    .select({
      id: memo.id,
      content: memo.content,
      tags: memo.tags,
      visibility: memo.visibility,
      createdAt: memo.createdAt,
      updatedAt: memo.updatedAt,
      space: { id: space.id, title: space.title, createdAt: space.createdAt },
    })
    .from(memo)
    .leftJoin(space, eq(memo.spaceId, space.id))
    .where(authored)
    .orderBy(asc(memo.createdAt), asc(memo.id));

  const spaces = [
    ...new Map(memos.flatMap((row) => (row.space ? [[row.space.id, row.space]] : []))).values(),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  const takenFolders = new Set<string>();
  const spaceFolders = new Map(
    spaces.map((s) => [s.id, `spaces/${claimUnique(takenFolders, slugify(s.title) || 'space')}`]),
  );

  // Only active attachments: a pending one is not part of its memo yet.
  const attachments = await db
    .select({ memoId: memo.id, filename: attachment.filename })
    .from(attachment)
    .innerJoin(memo, eq(attachment.memoId, memo.id))
    .where(and(authored, eq(attachment.status, 'active')))
    .orderBy(asc(attachment.createdAt), asc(attachment.id));
  const attachmentNames = new Map<string, string[]>();
  for (const { memoId, filename } of attachments) {
    attachmentNames.set(memoId, [...(attachmentNames.get(memoId) ?? []), filename]);
  }

  const files: Zippable = {};
  const takenPaths = new Set<string>();
  for (const row of memos) {
    const folder = row.space ? spaceFolders.get(row.space.id)! : 'personal';
    const date = row.createdAt.toISOString().slice(0, 10);
    const path = claimUnique(takenPaths, `${folder}/${date}-${memoSlug(row.content)}`);
    const names = attachmentNames.get(row.id);
    // A serializer, never concatenation: a space name or file name with a colon or a quote
    // must not be able to break the frontmatter.
    const frontmatter = stringify({
      created: row.createdAt.toISOString(),
      updated: row.updatedAt.toISOString(),
      visibility: row.visibility,
      tags: row.tags,
      ...(row.space && { space: row.space.title }),
      ...(names && { attachments: names }),
    });
    files[`${path}.md`] = strToU8(`---\n${frontmatter}---\n${row.content}`);
  }
  return zipSync(files);
};
