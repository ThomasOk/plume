# Memo lists paginate by a keyset cursor on their full sort key

The memo lists of a scope and Explore are read in pages, and each page resumes after the
last memo of the previous one, in the list's exact order: `(pinned_at, created_at, id)` in
a scope (ADR 0006), `(featured_at, created_at, id)` on Explore. The cursor is that key,
encoded and opaque to the client. We chose this over offset pagination because the lists
change while they are read: a memo written, pinned or deleted between two pages shifts
every row after it, and an offset then repeats or skips memos. Its cost also grows with
the depth of the page, where a keyset seek served by an index stays flat.

The cursor holds the pin or featured date, not only the creation date, because the order
puts pinned memos first: a cursor on `created_at` alone would resume among the wrong
block. The `id` makes the order total, so two memos written at the same instant are never
split, repeated or lost at a page boundary.

## Considered options

- **Offset pagination (`LIMIT … OFFSET …`)**: rejected for the duplicates and gaps above,
  and for its cost on deep pages. Its one advantage, jumping to page N, is something an
  infinite list does not offer.
- **A cursor on `created_at` alone**: rejected, it ignores the pinned and featured
  blocks and breaks on ties.

## Consequences

- **No page numbers, no "page 7" links.** Finding a specific memo goes through search
  and filters. Adding numbered pages later would mean a second pagination model.
- **Each list needs an index matching its sort key**, or the seek degrades to a sort of
  the whole scope. Changing a list's order means changing its cursor and its index
  together.
- **A cursor belongs to one list.** It carries which list it was issued for and is
  refused elsewhere, and the scope condition is always applied on top of it: a cursor
  never widens what a reader may see.
- **A memo pinned or featured while someone scrolls** moves above their cursor and only
  shows on the next refetch. Nothing is repeated or lost on the way down, which is the
  guarantee we wanted.
