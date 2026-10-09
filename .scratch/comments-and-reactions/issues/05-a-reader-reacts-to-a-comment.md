# 05: A reader reacts to a comment

**What to build:** A signed-in reader of a memo reacts to its comments exactly as to the
memo: the react button in the compact comment's header, the row of pills under its body,
the same picker, replacement and removal, the same optimistic update. A comment is a memo
(ADR 0001), so nothing new is stored: the permission is the parent memo's readability,
and `listComments` carries the same `reactions` summary as the other reads. Deleting a
memo removes its comments' reactions with them. See the spec, sections *Reacting* (story
28), *Reading reactions* (story 57) and *API contracts*.

**Blocked by:** 03 (A memo's page shows its comments as a conversation), 04 (A reader reacts to a memo).

**Status:** ready-for-agent

- [x] A reader reacts to a comment of a memo they can read; a caller who cannot read the parent gets `NOT_FOUND` (seam 1).
- [x] `listComments` carries the summary on each comment, for signed-in and anonymous readers (seam 1).
- [x] Deleting a memo removes its comments' reactions (seam 1).
- [x] The compact comment shows the react button and the row of pills with the same behaviour as a memo (seam 2).
- [x] Reacting to a comment updates the comment section at once, and rolls back on failure.
- [x] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass.
