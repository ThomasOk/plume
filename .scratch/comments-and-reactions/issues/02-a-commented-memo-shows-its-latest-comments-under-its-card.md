# 02: A commented memo shows its latest comments under its card

**What to build:** In every memo list, a commented memo carries a strip hanging off the
bottom edge of its card — the card drops its bottom rounding — in place of today's grey
box inside the card. The strip is titled "Comments" with the total count and a "View all"
link to the memo's comment section, then shows up to three of the most recent comments,
one line each: the commenter's 16px avatar, name, and the text stripped of Markdown and
truncated to one line. Each line links to the memo's page at that comment's anchor. The
strip asks for its comments only once the card nears the viewport, and asks for three:
`listComments` gains an optional `limit` that returns the most recent ones. So that those
links land today, each comment on the memo's page carries its id as its anchor. See the
spec, sections *Reading comments in the memo list*, *API contracts* and *Interface —
comments*.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `listComments` without `limit` returns every comment oldest first, as today; with `limit: 3`, the three most recent (seam 1).
- [ ] A memo without comments shows no strip.
- [ ] The strip shows the total count, at most three lines, and "View all" leading to the comment section anchor (seam 2).
- [ ] Each line leads to the memo's page at that comment's anchor, and the page scrolls to it.
- [ ] Comments are requested only when the card nears the viewport, never one full comment list per card on page load.
- [ ] The strip reads as attached to its card, in light and dark themes.
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass.
