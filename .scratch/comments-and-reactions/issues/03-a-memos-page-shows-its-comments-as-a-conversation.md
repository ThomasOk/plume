# 03: A memo's page shows its comments as a conversation

**What to build:** On a memo's own page, the comment section opens with a "Comments (n)"
heading. A signed-in reader gets a "Write a comment" button that opens the existing
comment form on demand — draft, attachments and character indicator unchanged — and the
form closes on save and on cancel; with no comments, that button is the whole section; an
anonymous reader gets no button. Comments read oldest first, each in a compact layout:
avatar, name and relative date (absolute on hover) on one line, then the body clamped to
a few lines and expandable, then attachments — no card shadow or hover effect. Each
comment keeps its anchor. The compact comment uses the actions menu and edit form
extracted in ticket 01, so the rules stay today's: the author edits and deletes, a space
admin deletes, an operator deletes a comment on a public memo. See the spec, sections
*Reading and writing comments on a memo's page* and *Interface — comments*.

**Blocked by:** 01 (The memo card is composed of reusable parts).

**Status:** ready-for-agent

- [x] The comment form is closed by default and opened by "Write a comment"; it closes on save and on cancel (seam 2).
- [x] With no comments, a signed-in reader sees the button alone; an anonymous reader sees no button (seam 2).
- [x] The heading shows the number of comments.
- [x] Comments read oldest first, each with its id as anchor (seam 2).
- [x] A long comment is clamped and can be expanded.
- [x] The author can edit and delete their comment; a space admin and an operator (on a public memo) can delete it; nobody else is offered either (seam 2).
- [x] An unsent comment survives navigation as a draft, as today.
- [x] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass.
