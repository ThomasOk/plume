# 04: A reader reacts to a memo

**What to build:** A signed-in reader of a memo — author included, in their personal
scope, in a space, or on Explore — leaves a **reaction** on it, picked from the fixed set
👍 ❤️ 😂 🎉 💡 🙏 😢. Each reader has one reaction per memo: picking another replaces it.
A react button in the memo's header (shown on hover or focus on pointer devices, always on
touch) opens a picker with the seven emojis, the current one pressed. Under the body, a
row of pills shows each emoji received with its count, the reader's own pressed; clicking
one's own pill takes the reaction back, another pill moves it there, and a round add
control opens the picker. No row without reactions. An anonymous reader sees the pills,
not as buttons, and no react button. Reacting shows at once and rolls back with a toast if
the server refuses. Reacting notifies no one. A move clears the memo's reactions; an edit,
including private ↔ public, keeps them. Reactions go with a deleted memo and with a
deleted account, never to the Former user.

Server side: a `reaction` table with one row per user per memo enforced by a unique
constraint, cascading on memo and on user, the emoji as validated `text` (not a
`pgEnum` — see the spec); `react({ memoId, emoji })` and `unreact({ memoId })`,
idempotent, `NOT_FOUND` on a memo the caller cannot read; and a `reactions` summary —
`{ emoji, count, reactedByMe, reactors }`, ordered as the set — on every read that
returns memos (scope lists, space lists, Explore, a memo's page), computed in one grouped
query per page. The reactors' names are delivered now; showing them is ticket 06. The
optimistic rewrite of the summary is a pure function. See the spec, sections *Reacting*,
*Reading reactions*, *Reactions over time*, *Domain model*, *Schema*, *API contracts* and
*Interface — reactions*.

**Blocked by:** 01 (The memo card is composed of reusable parts).

**Status:** ready-for-agent

- [ ] The schema change follows the workflow in `AGENTS.md`, with the generated migration committed.
- [ ] A reader reacts; the summary shows the emoji, count 1, `reactedByMe` for them and their name among the reactors, for them and for another reader (seam 1).
- [ ] Reacting with another emoji replaces the reaction; with the same emoji changes nothing; `unreact` removes it and is harmless without one (seam 1).
- [ ] Several readers: counts per emoji, ordered as the set, no entry at zero (seam 1).
- [ ] The author may react to their own memo (seam 1).
- [ ] An anonymous caller cannot react; a caller who cannot read the memo gets `NOT_FOUND` on `react` and `unreact`; an emoji outside the set is rejected (seam 1).
- [ ] The summary is on a personal list, a space list, Explore and a memo's page; an anonymous reader of Explore gets counts and names with `reactedByMe` false (seam 1).
- [ ] A move clears the memo's reactions; switching a personal memo between private and public keeps them (seam 1).
- [ ] Deleting a memo removes its reactions; deleting an account removes that user's reactions and passes nothing to the Former user (seam 1, account deletion suite).
- [ ] Reacting creates no notification and records no outbox event (seam 1).
- [ ] Row, pills, add control and picker behave as described, for a signed-in and an anonymous reader (seam 2).
- [ ] The summary rewrite handles a first reaction, a replacement, a removal, the last of an emoji, and keeps the order (seam 3).
- [ ] A refused reaction disappears and a toast says so.
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass.
