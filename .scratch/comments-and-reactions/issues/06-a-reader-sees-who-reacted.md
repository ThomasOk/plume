# 06: A reader sees who reacted

**What to build:** Every reader of a memo, anonymous ones included, can see who chose
each emoji. On hover and focus, a pill's tooltip names up to four reactors — the reader
first, as "You" — then "and N others": "You, Alice and 3 others reacted with 👍". The same
sentence is the pill's accessible label, so a screen reader announces it. On touch, a
long press on a pill opens a popover listing every reactor, while a tap keeps reacting.
The names already arrive in the summary since ticket 04; this ticket shows them, on
memos and on comments alike through the shared pill. See the spec, sections *Reading
reactions* (stories 52–56) and *Interface — reactions*.

**Blocked by:** 04 (A reader reacts to a memo).

**Status:** ready-for-agent

- [ ] The accessible label reads "You, Alice and N others reacted with …", with the reader first as "You" and four names at most (seam 2).
- [ ] Without the reader among the reactors, the label lists other names only; with five or more, "and N others" counts the rest (seam 2).
- [ ] The tooltip shows the same sentence on hover and on keyboard focus.
- [ ] On touch, a long press lists every reactor, and a tap still reacts.
- [ ] An anonymous reader sees the names too.
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass.
