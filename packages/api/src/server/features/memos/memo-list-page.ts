import { and, desc, isNull, or, sql, type SQL } from '@repo/db';
import { memo } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

/**
 * Pages of a memo list, read by a keyset cursor on the list's full sort key (ADR 0008):
 * `(leading, created_at, id)`, where the leading column puts the pinned or the featured
 * first, latest on top, then the rest newest first.
 */

// The server's, never the client's: a client choosing it could ask for the whole list again.
export const PAGE_SIZE = 20;

// The column that puts some memos first in a list: the pin in a scope, the featuring on Explore.
export type LeadingColumn = typeof memo.pinnedAt | typeof memo.featuredAt;

// Which list a cursor was issued for, so that it is refused by any other.
export type ListName = 'explore';

// The sort key of a memo, as Postgres holds it. Timestamps travel as Postgres prints them, to
// the microsecond: a `Date` keeps milliseconds, and a cursor rounded below its own memo would
// return it again or skip its neighbours.
type SortKey = [leading: string | null, createdAt: string, id: string];

// What `timestamp::text` prints, which `::timestamp` reads back exactly.
const timestampText = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/)
  // A well-formed but impossible instant (a 30 February) would reach Postgres and fail there.
  .refine((s) => {
    const iso = `${s.slice(0, 19).replace(' ', 'T')}Z`;
    const date = new Date(iso);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 19) === iso.slice(0, 19);
  });

const cursorSchema = z.object({
  list: z.string(),
  key: z.tuple([timestampText.nullable(), timestampText, z.string().min(1)]),
});

const invalidCursor = () => new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid cursor' });

export const encodeCursor = (list: ListName, key: SortKey) =>
  Buffer.from(JSON.stringify({ list, key })).toString('base64url');

// Malformed, tampered into an impossible key, or issued for another list: a bad request
// either way. A well-formed key only says where to resume; the list's own condition still
// decides which memos may be read.
export const decodeCursor = (list: ListName, cursor: string): SortKey => {
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw invalidCursor();
  }
  const parsed = cursorSchema.safeParse(decoded);
  if (!parsed.success || parsed.data.list !== list) throw invalidCursor();
  return parsed.data.key;
};

// The sort key columns, selected as text beside the row so the cursor carries them exactly.
export const sortKeyColumns = (leading: LeadingColumn) => ({
  leading: sql<string | null>`${leading}::text`.as('leading_key'),
  createdAt: sql<string>`${memo.createdAt}::text`.as('created_at_key'),
});

// Postgres puts nulls first in a descending order, hence the explicit `NULLS LAST`; the id
// makes the order total, so memos written at the same instant never trade places.
export const listOrder = (leading: LeadingColumn) => [sql`${leading} DESC NULLS LAST`, desc(memo.createdAt), desc(memo.id)];

// The memos strictly after the key, in that order. Among the leading block (a key with a
// leading date), what follows is the rest of the block, then every memo outside it; outside
// it, only the rest of the memos outside it.
export const afterCursor = (leading: LeadingColumn, [leadingKey, createdAt, id]: SortKey): SQL => {
  const laterInBlock = sql`(${memo.createdAt}, ${memo.id}) < (${createdAt}::timestamp, ${id})`;
  if (leadingKey === null) return and(isNull(leading), laterInBlock)!;
  return or(
    sql`${leading} < ${leadingKey}::timestamp`,
    and(sql`${leading} = ${leadingKey}::timestamp`, laterInBlock),
    isNull(leading),
  )!;
};
