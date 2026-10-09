# 01: The memo card is composed of reusable parts

**What to build:** No visible change. The memo card is split into parts a compact comment
can reuse without copying their rules: the header (author, relative date with its
absolute tooltip, the visibility, pin and featured marks), the actions menu (open, pin,
feature, edit, move, delete — with today's rules for author, space admin and operator,
ADR 0007), and the edit form (textarea, attachments, footer, focus mode). The card then
composes them exactly as it renders today. This is the prefactor that tickets 03 and 04
build on: the compact comment reuses the menu and the edit form, and the react button
goes into the header. See the spec, `.scratch/comments-and-reactions/spec.md`, sections
*Interface — comments* and *Further Notes*.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The memo card renders the same memo, comment, pinned, featured and editing states as before.
- [ ] The actions menu's rules (who may edit, delete, pin, feature, move) live in one place a compact comment can use.
- [ ] The edit form, focus mode included, is usable outside the memo card.
- [ ] The header can take an extra action slot (for the react button of ticket 04).
- [ ] The existing memo card tests pass without modification.
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass.
