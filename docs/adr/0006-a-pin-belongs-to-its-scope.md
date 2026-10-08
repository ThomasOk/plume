# A pin belongs to its scope

A pin puts a memo first in its scope, and it is decided by whoever governs that scope: the
author in the personal scope, an admin in a space. It is stored on the memo, as a nullable
`memo.pinned_at`, so every reader of the memo sees the same pin. We chose this over a
per-reader pin because the two only differ inside a space, and that is exactly where a
shared pin is worth having: a team's reference memo, first for everyone.

Pinning is curation, not an edit. An admin may pin another member's memo — which the role
matrix forbids them to edit — because a pin changes where the memo stands, not the words
written under its author's byline, much as deleting is moderation. The converse follows: a
member may neither pin nor unpin their own memo in a space, since the pin is the space's
decision, not theirs.

## Considered options

- **A per-reader pin (a `user_id, memo_id` table)** — rejected: in the personal scope it
  is indistinguishable from a pin on the memo, and in a space it is a bookmark, a different
  feature nobody asked for. It would cost a join on every list.
- **A boolean `pinned`, ordered by creation date** (usememos' shape) — rejected: a memo
  pinned today would sit below one pinned last month if it was written earlier, against the
  intent of whoever just pinned it. `pinned_at` costs the same column and orders pins by the
  latest decision.
- **Pinning through the memo update** (usememos' `updateMask: ["pinned"]`) — rejected: an
  update is an edit, checked by `mayEditMemo`, retagging the content and touching
  `updatedAt`; an admin could not pin. `pin` and `unpin` are their own idempotent
  operations, so a retry or a double click never toggles the memo back, and re-pinning
  keeps the original `pinned_at`.

## Consequences

- **A move unpins.** A pin set in one scope by whoever governs it would otherwise land in
  another scope where nobody decided it — and a member could pin in a space by moving a
  pinned personal memo into it.
- **Explore ignores pins**, in its order and its display. It mixes every author's memos and
  is no one's scope: honouring pins there would let any author take the top of the public
  page (usememos shipped that by accident and reverted it). Highlighting announcements on
  Explore is a separate concept, decided by the operator of the instance, with its own
  storage. Trigger: that feature.
- **No limit on the number of pins.** In a space, restricting pins to admins is the
  governance; a cap would add a counting invariant that needs a lock against concurrent
  pins. Adding one later needs no migration. Trigger: a space whose pins push everything
  else out of sight.
