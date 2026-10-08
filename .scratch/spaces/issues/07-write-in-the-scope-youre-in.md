# 07 — Write in the scope you're in

**What to build:** The memo form writes into the scope on screen. Inside a Space, it offers
no audience choice and shows the Space's title instead; in the personal scope, it offers
private or public only. Each scope keeps its own Draft. See the spec's *Revisions* section
(2026-10-08) for why the flat audience list from ticket 03 is withdrawn.

The rule:

- **Inside a Space**, the Memo goes into that Space. The audience control is replaced by a
  non-interactive label: the group icon and the Space's title. It must not look like a menu
  — no chevron, no hover state. While the Space's title is loading, it reads "Space".
- **Editing a Memo of a Space** shows the same label with the Space's title, replacing the
  generic "Space" shown today. Writing and editing say the same thing.
- **In the personal scope**, the audience control offers private and public only — the
  User's Spaces are no longer listed. A Memo reaches a Space by being written there, or by
  Move.
- **Drafts are per scope.** The personal scope keeps the existing Draft key, so drafts
  already saved are not lost; each Space gets its own. A Draft started in one scope never
  appears in another.

Unchanged: the API (it already validates membership on Space writes), Move, switching a
personal Memo between private and public by editing it, and Comments, which take their
parent's audience and offer no control.

Tests — one component seam, prior art `space-actions-menu.test.tsx`: render the memo form
with its mutation and Space hooks mocked and the scope supplied by mocking the hook that
reads it from the URL. Assert what the User sees and what gets created, not internals. The
existing Playwright scenario that writes from inside a Space asserts an audience *button*
named after the Space; update it to the label, and assert the personal menu no longer
offers the Space.

**Blocked by:** 03 — Write, read and comment on Memos in a Space.

**Status:** ready-for-agent

- [x] Inside a Space, the form offers no audience control and shows the Space's title
- [x] Inside a Space, saving creates the Memo in that Space
- [x] Editing a Memo of a Space shows the same label, with the Space's title
- [x] In the personal scope, the audience control offers private and public only
- [x] In the personal scope, saving creates a personal Memo with the chosen visibility
- [x] A Draft typed in the personal scope does not appear in a Space's form, and vice versa
- [x] A Draft saved before this change is still restored in the personal scope
- [x] The Playwright scenario for writing inside a Space is updated to the label
- [x] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass

## Comments

**2026-10-08** — Follow-up, not in this ticket: on a Memo's own page, outside its Space's
page, the label reads "Space" rather than the Space's title, because reading one Memo does
not return its Space. That page already lacks the reader's Role for the same reason; both
are solved by exposing the Memo's Space when a Memo is read.
