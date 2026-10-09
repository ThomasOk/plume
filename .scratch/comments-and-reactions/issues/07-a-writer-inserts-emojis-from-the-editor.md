# 07: A writer inserts emojis from the editor

**What to build:** The editor — the same for memos and comments, when writing, editing
and in focus mode — gains an emoji button, labelled "Insert emoji", next to "Attach
file". It opens a picker (`frimousse`) with search, categories and keyboard navigation.
A pick inserts the emoji at the caret through the editor's existing insertion path,
replacing the selection if any; the picker stays open for the next one, and Escape or a
click outside closes it and returns focus to the text, caret after the last emoji. The
picker and its emoji data load on demand — a dynamic import on first open, started early
on hover or focus of the button — and the emoji data is served by Plume as a static
asset, never fetched from a third-party CDN at runtime. Emojis are plain characters in
the content: no storage or rendering change, and the character indicator counts as today.
See the spec, sections *Emojis in the editor* and *Interface — emojis in the editor*.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The button is present when writing a memo, writing a comment, editing either, and in focus mode (seam 2, memo form).
- [ ] A pick inserts the emoji at the caret in the middle of existing text, and replaces a selection (seam 2, with a test double for the picker).
- [ ] The picker stays open after a pick; closing it returns focus to the text field (seam 2).
- [ ] An inserted emoji is part of what is saved and of the draft.
- [ ] The picker is absent from the initial bundle and loads on first use.
- [ ] Opening the picker makes no request to a third-party domain.
- [ ] The picker is usable with the keyboard alone.
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass.
