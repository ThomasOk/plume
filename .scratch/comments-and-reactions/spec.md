# Spec — Comments, reworked, reactions, and emojis in the editor

Status: ready-for-agent

> Reference spec for the feature. Decisions here are the contract the implementation
> follows. Companion documents: `docs/adr/0001-comments-are-self-referential-memos.md` (a
> comment is a memo, so a reaction on a comment needs nothing of its own),
> `docs/adr/0006-a-pin-belongs-to-its-scope.md` (whose reasoning a move clearing reactions
> follows). Domain vocabulary: `GLOSSARY.md` (**Reaction**, **Comment**, **Memo**,
> **Author**, **Audience**, **Visibility**). Inspired by usememos
> (`MemoCommentSection`, `MemoCommentListView`, `MemoReactionListView`), with the
> departures recorded under *Further Notes*.

## Problem Statement

A reader who likes a memo, finds it useful, or wants its author to know it was seen has
only one way to say so: writing a comment. A comment is a whole memo, with an editor, a
save, and a notification to the author — far too heavy for "thanks" or "nice one". So
most readers say nothing, and in a space the author never learns whether anyone read
what they wrote.

Comments themselves read poorly. In the memo list, each commented memo shows a grey box
inside its card, listing the first comments as plain text; and the list loads every
comment of every commented memo to show three of them, one request per card. On a memo's
own page, the comment form stands open at the top whether the reader wants to write or
not, pushing the comments down; and each comment is a full memo card — hover shadow,
actions menu, 500px of expandable Markdown — so a conversation of short replies looks
like a wall of memos.

And a writer who wants an emoji in a memo or a comment has to know where their system
hides it. Plume stores and renders emojis fine, and a phone keyboard has its emoji key,
but on a desktop the system shortcuts are unknown to most people: the editor offers no
way to find an emoji, where every social network has one a click away.

## Solution

Three changes, shipped as three tickets.

**Comments, reworked.** In the memo list, a commented memo carries a strip hanging off the
bottom edge of its card: up to three of its most recent comments, one line each — the
commenter's avatar, name and the start of the text — each line leading to that comment
on the memo's page, and a "View all" leading to the comment section. The strip loads only
as the card nears the viewport, and only the three comments it shows. On a memo's page,
the comment section opens with a "Comments (n)" heading and a "Write a comment" button
that opens the editor on demand; with no comments, that button is the whole section.
Comments read oldest first, each in a compact layout — avatar, name and date on one line,
the body clamped to a few lines and expandable — and each has its own anchor.

**Reactions.** A signed-in reader leaves an emoji on a memo or a comment, picked from a
fixed set of seven: 👍 ❤️ 😂 🎉 💡 🙏 😢. Each reader has at most one reaction per memo;
picking another replaces it. Reactions show as a row of pills under the body — the emoji
and how many chose it — the reader's own pill highlighted. Clicking one's own pill takes
the reaction back; clicking another moves it there. Every reader, signed in or not, can see
who reacted. Reacting notifies no one. A move clears the memo's reactions; an edit keeps
them.

**Emojis in the editor.** The memo editor — the same one for memos and for comments —
gains an emoji button next to "Attach file". It opens a picker with search and
categories; the chosen emoji goes in at the caret, the picker stays open for the next
one, and closing it returns focus to the text. The picker and its data load only when
the writer reaches for it.

## User Stories

### Reading comments in the memo list

1. As a reader of a memo list, I want a commented memo to show its latest comments right
   under its card, so that I see the conversation is alive without opening the memo.
2. As a reader, I want at most three comments in that strip, so that a busy memo does not
   swallow the list.
3. As a reader, I want the strip to show the most recent comments, so that I see where the
   conversation is now rather than how it began.
4. As a reader, I want each line to show the commenter's avatar and name before the text,
   so that I know who is talking at a glance.
5. As a reader, I want a long comment cut to one line in the strip, with Markdown
   formatting stripped, so that the strip stays a glance and not a page.
6. As a reader, I want the strip to say how many comments the memo has in all, so that I
   know whether there is more than what I see.
7. As a reader, I want clicking a comment line to take me to that comment on the memo's
   page, so that I land where I wanted to read.
8. As a reader, I want a "View all" link to the memo's comment section, so that I can read
   the whole conversation.
9. As a reader, I want the strip to look attached to the memo it belongs to, so that I
   never mistake it for the next memo in the list.
10. As a reader, I want a memo without comments to show no strip, so that the list stays
    quiet.
11. As a reader scrolling a long list, I want comments to load only for the memos I am
    about to see, so that the list stays fast.

### Reading and writing comments on a memo's page

12. As a reader of a memo, I want a "Comments (n)" heading above the comments, so that I
    know how many there are before scrolling.
13. As a reader, I want the comment editor closed until I ask for it, so that the
    comments themselves come first.
14. As a signed-in reader, I want a "Write a comment" button that opens the editor, so
    that writing is one click away.
15. As a signed-in reader of a memo with no comments, I want the section to be just that
    button, so that an empty section invites a first comment instead of showing a void.
16. As an anonymous reader, I want no button to write a comment, so that I am not offered
    what I cannot do.
17. As a commenter, I want the editor to keep my unsent comment as a draft, as it does
    today, so that I lose nothing by navigating away.
18. As a commenter, I want the editor to close once my comment is saved, so that the
    section returns to reading.
19. As a commenter, I want to cancel the editor, so that I can change my mind.
20. As a reader, I want comments oldest first, so that the conversation reads in the order
    it happened.
21. As a reader, I want each comment in a compact layout — avatar, name and date on one
    line, then the text — so that a conversation of short replies reads as a conversation.
22. As a reader, I want a long comment clamped to a few lines with a way to expand it, so
    that one long comment does not bury the others.
23. As a reader following a link to a comment, I want the page to scroll to that comment,
    so that I land on what I was sent to.
24. As a comment's author, I want to edit and delete my comment from the compact layout,
    as I can today, so that the redesign takes nothing away.
25. As an operator, I want to delete a comment on a public memo from the compact layout, as
    I can today, so that moderation keeps working.
26. As a space admin, I want to delete a member's comment in my space, as I can today, so
    that governance keeps working.

### Reacting

27. As a signed-in reader of a memo, I want to react to it with an emoji, so that I can
    tell its author I liked it without writing anything.
28. As a signed-in reader of a comment, I want to react to it too, so that I can
    acknowledge a reply the same way.
29. As a reader, I want a small fixed set of emojis to choose from — 👍 ❤️ 😂 🎉 💡 🙏 😢 —
    so that choosing is quick and every emoji means something distinct.
30. As a reader, I want 👍 first, so that the most common reaction is the easiest.
31. As a reader, I want a react button in the memo's header, so that I can react even when
    no one has yet.
32. As a desktop reader, I want that button to appear only when I hover or focus the memo,
    so that a list of memos stays calm.
33. As a touch reader, I want that button always visible, so that I can react without a
    hover I cannot make.
34. As a reader, I want the button to open a picker with the seven emojis, my current
    reaction highlighted, so that I see what I chose.
35. As a reader, I want picking an emoji to react, and the picker to close, so that
    reacting is two clicks.
36. As a reader who already reacted, I want picking another emoji to replace my reaction,
    so that I can change my mind in one step.
37. As a reader who already reacted, I want picking my current emoji again to take my
    reaction back, so that undoing is as easy as doing.
38. As the author of a memo, I want to react to my own memo, so that my memo works for
    me as it does for every other reader.
39. As a reader of a memo in a space, I want to react to any member's memo there, so that
    reactions work wherever I can read.
40. As a reader on Explore, signed in, I want to react to any public memo, so that I can
    appreciate other users' work.
41. As an anonymous reader, I want to see reactions but not be offered to react, so that I
    am not offered what I cannot do.
42. As a reader whose reaction is slow to reach the server, I want it to show at once, so
    that reacting feels instant.
43. As a reader whose reaction failed, I want it to disappear and a message to tell me, so
    that I never believe a reaction that did not happen.
44. As a reader double-clicking an emoji, I want to end up with that reaction, not with
    none, so that a stutter does not undo what I meant.

### Reading reactions

45. As a reader, I want a row of pills under the memo's body, one per emoji received, with
    how many chose it, so that I see the memo's reception at a glance.
46. As a reader, I want my own pill highlighted, so that I see which reaction is mine.
47. As a reader, I want clicking my own pill to take my reaction back, so that undoing
    does not need the picker.
48. As a reader, I want clicking another pill to move my reaction there, so that agreeing
    with others is one click.
49. As a reader, I want a small add control at the end of the row that opens the picker,
    so that reacting with a new emoji is close to the existing ones.
50. As a reader of a memo with no reactions, I want no row at all, so that the memo stays
    quiet.
51. As a reader, I want an emoji no one chooses any more to leave the row, so that the row
    shows only what is true.
52. As a desktop reader, I want hovering or focusing a pill to show who chose it — up to
    four names, then "and N others" — so that I know who reacted, not just how many.
53. As a reader who reacted, I want to appear as "You", first, so that I find myself
    without reading every name.
54. As a touch reader, I want a long press on a pill to show everyone who chose it, so
    that I see the names too while a tap still reacts.
55. As a screen-reader user, I want each pill to announce its emoji, its count and who
    chose it, so that the row tells me what it tells sighted readers.
56. As an anonymous reader on Explore, I want to see who reacted to a public memo, so that
    the reactions tell me the same as they tell a signed-in reader.
57. As a reader of a comment, I want the same row under the comment, so that comments and
    memos behave alike.

### Reactions over time

58. As an author, I want reactions to notify no one, so that a reaction stays a light
    gesture and my notifications stay about comments.
59. As an author moving a memo to another audience, I want its reactions cleared, so that
    the new readers do not see the reactions — and the names — of an audience that is no
    longer reading it.
60. As an author switching a personal memo between private and public, I want its
    reactions kept, so that an edit, which leaves the memo where it is, does not erase
    its reception.
61. As a user deleting my account, I want my reactions to go with it, so that nothing of my
    gestures outlives me — they do not pass to the Former user.
62. As an author deleting a memo, I want its reactions, and its comments' reactions, to
    go with it, so that nothing is left behind.
63. As a reader who lost access to a memo, I want my reaction to be unreachable to me, as
    the memo is, so that a memo I cannot read reveals nothing to me.

### Emojis in the editor

64. As a writer on a desktop, I want an emoji button in the editor, so that I can add an
    emoji without knowing my system's shortcut.
65. As a writer, I want that button both when writing a memo and when writing a comment,
    so that the editor behaves the same everywhere.
66. As a writer, I want the button to open a picker with categories, so that I can browse
    when I do not know what I am looking for.
67. As a writer, I want to search the picker by name, so that I find "fire" or "tada"
    without scrolling.
68. As a writer, I want the chosen emoji inserted where my caret is, not at the end of the
    text, so that I can put it in the middle of a sentence.
69. As a writer, I want the picker to stay open after a pick, so that I can add several
    emojis in a row.
70. As a writer, I want Escape or a click outside to close the picker and put me back in
    the text after what I inserted, so that I keep typing where I left off.
71. As a writer replacing a selection, I want the emoji to replace the selected text, as
    typing would, so that the editor behaves like any text field.
72. As a writer editing an existing memo or comment, I want the same button, so that an
    edit offers what writing did.
73. As a writer in focus mode, I want the same button, so that focus mode loses nothing.
74. As a mobile writer, I want the button too, so that I can use it even if I prefer it to
    my keyboard's emoji key.
75. As a writer with a draft, I want inserted emojis saved in my draft like any typed
    text, so that nothing is lost.
76. As a reader of any page, I want the picker to cost nothing until someone opens it, so
    that pages load as fast as before.
77. As a writer on a slow connection, I want the picker to start loading when I point at
    the button, so that it is ready by the time I click.
78. As a keyboard user, I want to reach the button, open the picker, search, move through
    the emojis and pick one with the keyboard alone, so that the picker does not need a
    mouse.

## Implementation Decisions

### Domain model

- A **reaction** belongs to exactly one memo; a comment is a memo (ADR 0001), so reactions
  on comments need no target type and no second table. Nothing else can be reacted to.
- The set of emojis is fixed in code, in order: 👍 ❤️ 😂 🎉 💡 🙏 😢. Distinct meanings on
  purpose — acknowledge, love, laugh, celebrate, insightful, thanks, sympathise — and no
  hostile negative: in a space shared between colleagues, a thumbs-down on someone's memo
  reads as a reproach. The set is a shared Zod enum exported from the API schemas, so the
  server validates and the web client renders from the same list.
- One reaction per user per memo. Choosing another replaces it.
- Reacting is open to any signed-in user who can read the memo — for a comment, who can
  read its parent — the author included. Reading reactions, names included, is open to
  anyone who can read the memo, anonymous readers on Explore included.
- Reacting emits no domain event and creates no notification.

### Schema

- A new `reaction` table: its own id, `memo_id` (references the memo, `ON DELETE
  CASCADE`, which also covers comments deleted with their parent), `user_id` (references
  the user, `ON DELETE CASCADE`: a reaction does not pass to the Former user), `emoji`
  (`text`, not null), `created_at`, `updated_at`.
- A unique constraint on `(user_id, memo_id)` makes "one reaction per user per memo" a
  database fact, not just an application rule.
- An index on `memo_id` for the grouped read.
- `emoji` is `text` validated by the Zod enum, deliberately not a `pgEnum`: adding an
  emoji later should be a code change, not a migration — and the memo schema already
  documents why a newly added enum value cannot be used in the migration that adds it. A
  comment on the column records this.
- Follow the schema workflow in `AGENTS.md`: edit the schema, `pnpm db:generate`, commit
  the generated migration, `pnpm db:migrate`.

### API contracts

- `memos.react({ memoId, emoji })` — protected. Sets the caller's reaction on the memo,
  replacing any other: an upsert on `(user_id, memo_id)`. Idempotent: replaying it yields
  the same state. A memo the caller cannot read answers `NOT_FOUND`, as every other memo
  procedure does, so its existence is not disclosed. An emoji outside the set is a
  validation error.
- `memos.unreact({ memoId })` — protected. Removes the caller's reaction on the memo,
  whatever it is. Idempotent: no reaction is not an error. A memo the caller cannot read
  answers `NOT_FOUND`.
- No toggle. As with pins, each call names the state it wants, so two quick clicks cannot
  cancel each other in flight.
- Every read that returns memos or comments — a scope's list (personal and space), Explore,
  a memo's page, `listComments` — carries a `reactions` summary on each item:
  `Array<{ emoji, count, reactedByMe, reactors: Array<{ id, name }> }>`, ordered as the
  emoji set, emojis with no reaction left out. `reactedByMe` is false for an anonymous
  reader. The summary is computed in one grouped query over the ids of the page, never one
  query per memo.
- `memos.listComments` takes an optional `limit`. Without it, comments come oldest first,
  as the comment section reads them. With it, it returns the `limit` most recent, which
  is what the list's strip asks for; `commentCount` on the parent remains the total.
- `memos.move` deletes the memo's reactions in the same transaction as the move — the
  same place it already clears the pin. `memos.update` leaves reactions alone, including
  when it switches a personal memo between private and public.

### Interface — comments

- **Comment strip** (replaces the comment preview inside the card): rendered under the
  memo card, visually attached to its bottom edge — the card drops its bottom rounding
  when it has a strip. Title "Comments" with the total count, a "View all" link to the
  memo's comment section anchor, then up to three rows of the most recent comments: a
  16px avatar, the commenter's name, the comment's text stripped of Markdown and
  truncated to one line. Each row links to the memo's page at that comment's anchor. The
  strip requests its comments only once the card nears the viewport, with `limit: 3`.
- **Comment section** (memo's page): heading "Comments (n)"; a "Write a comment" button for
  signed-in readers, opening the existing comment form on demand (draft, attachments,
  character indicator unchanged); with no comments, the button alone stands for the
  section. The form closes on save and on cancel.
- **Compact comment**: avatar, name and relative date (absolute date on hover) on one
  line, then the body clamped to a few lines and expandable, then attachments, then the
  reaction row. No card shadow or hover effect. The actions menu keeps exactly today's
  rules: edit for the author, delete for the author, a space admin, or an operator on a
  public memo. Each comment's root element carries the comment id as its DOM id, so a
  fragment link scrolls to it.
- The comment section keeps its own anchor id, which the strip's "View all" uses.

### Interface — reactions

- **React button**: a smile-plus icon in the header of a memo and of a compact comment,
  for signed-in readers only. On pointer devices it shows while the memo is hovered,
  focus is within it, or its picker is open; on touch devices it is always shown.
- **Picker**: a popover with the seven emojis in order, the caller's current one marked
  as pressed. Picking the current one calls `unreact`; picking another calls `react`. The
  picker closes on pick.
- **Reaction row**: under the body (and attachments), only when the memo has at least one
  reaction. One pill per emoji: the emoji and its count, `aria-pressed` on the caller's
  own. Clicking one's own pill calls `unreact`; clicking another calls `react` with that
  emoji. A round add control ends the row and opens the same picker. For an anonymous
  reader, pills are not buttons and there is no add control.
- **Who reacted**: on hover and focus, a tooltip names up to four reactors, the caller
  first as "You", then "and N others" — e.g. "You, Alice and 3 others reacted with 👍".
  The same sentence is the pill's accessible label. On touch, a long press on a pill
  opens a popover listing every reactor; a tap keeps its meaning.
- **Optimistic update**: `react` and `unreact` rewrite the summary in every cached read
  holding the memo before the server answers, and roll back with an error toast on
  failure. The rewrite is a pure function — given a summary, the caller, and the
  caller's new reaction (an emoji, or none), return the new summary: count and
  `reactedByMe` and `reactors` adjusted on the old and new emoji, an emoji that drops to
  zero removed, order kept. On settle, the affected reads are invalidated.

### Interface — emojis in the editor

- An emoji button (smile icon, labelled "Insert emoji") in the editor's footer, beside
  "Attach file". It is part of the shared editor, so it appears when writing and editing
  a memo, writing and editing a comment, and in focus mode.
- The picker is `frimousse`: small, headless, styled with the app's own components. It
  provides search, categories and keyboard navigation.
- The picker and its emoji data are loaded on demand: a dynamic import on first open,
  started early when the button is hovered or focused. Nothing of it is in the initial
  bundle.
- The emoji data is served by Plume, as a static asset of the web app, not fetched from
  a third-party CDN at runtime: the editor makes no request to an outside domain, and
  does not break when that CDN does. The picker is configured to read from it.
- A pick inserts the emoji at the caret through the editor's existing insertion path —
  the one tag suggestions use — replacing the selection if there is one. The picker
  stays open; Escape or a click outside closes it and returns focus to the text field,
  with the caret after the last inserted emoji.
- Emojis are ordinary characters in the content: no shortcode, no storage change, no
  rendering change. The character indicator keeps counting as it does today (see *Out of
  Scope*).

### Documentation

- `GLOSSARY.md` already defines **Reaction** (written during the design session). No ADR:
  one reaction per user is easy to reverse (relaxing a unique constraint), clearing on
  move follows ADR 0006, and `text` over `pgEnum` is recorded in the schema.

## Testing Decisions

A good test here states a rule of the domain in the vocabulary of the glossary and checks
it through the system's outside: what a caller can do and what a reader sees. It does
not inspect tables, query shapes or component internals. Each test names the rule it
holds ("a move clears the memo's reactions"), not the mechanism.

### Seam 1 — the tRPC caller against a real Postgres (existing)

Prior art: `pinned-memos.integration.test.ts`, `featured-memos.integration.test.ts`,
`account-deletion.integration.test.ts` — authenticated and anonymous callers created with
the test helpers, a Postgres started by Testcontainers.

- A reader reacts to a memo; the summary shows the emoji with count 1, `reactedByMe` for
  them, and their name among the reactors — for themselves and for another reader.
- Reacting again with another emoji replaces the reaction; with the same emoji changes
  nothing.
- `unreact` removes the reaction, and is harmless without one.
- Several readers on one memo: counts per emoji, emojis ordered as the set, no entry for an
  emoji at zero.
- The author may react to their own memo.
- A reader reacts to a comment, allowed by its parent's readability.
- Refusals: an anonymous caller cannot react; a caller who cannot read the memo (a private
  memo of someone else, a space memo for a non-member) gets `NOT_FOUND` on `react` and on
  `unreact`; an emoji outside the set is rejected.
- The summary is present in a scope's list, in a space's list, on Explore, on a memo's page
  and in `listComments`; an anonymous reader of Explore sees counts and names with
  `reactedByMe` false.
- A move clears the memo's reactions; switching a personal memo between private and public
  keeps them.
- Deleting a memo removes its reactions and its comments' reactions; deleting an account
  removes that user's reactions everywhere and nothing passes to the Former user (extend
  the account deletion suite).
- Reacting creates no notification and records no outbox event.
- `listComments` without `limit` returns every comment oldest first; with `limit: 3`
  returns the three most recent.

### Seam 2 — components rendered with mocked hooks (existing)

Prior art: `memo-card.test.tsx` — the component rendered with the router helper, the
feature's hooks mocked to capture the calls.

- Reaction row: no row without reactions; pills with emoji and count; the caller's pill
  pressed; clicking one's own pill calls `unreact`, another pill calls `react` with that
  emoji; the add control opens the picker.
- Picker: seven emojis in order, the current one pressed; picking another calls `react`,
  picking the current one calls `unreact`.
- Anonymous reader: pills shown but not buttons, no add control, no react button.
- Who reacted: the accessible label reads "You, Alice and N others reacted with …" with
  four names at most.
- Comment section: the form closed by default and opened by "Write a comment"; the empty
  section is the button; no button for an anonymous reader; comments oldest first; each
  comment carries its id as anchor.
- Compact comment: today's action rules kept (author edits and deletes, admin and
  operator delete).
- Comment strip: absent without comments; the total count; at most three rows; each row
  links to the memo's page at the comment's anchor; "View all" links to the section.

### Seam 2, continued — the memo form (existing)

Prior art: `memo-form.test.tsx`. The lazily loaded picker is replaced by a test double
that offers a few emojis, so the test holds the editor's behaviour, not the library's.

- The emoji button is present when writing a memo and when writing a comment.
- Picking an emoji inserts it at the caret, in the middle of existing text; with a
  selection, it replaces the selection.
- The picker stays open after a pick; closing it returns focus to the text field.
- An inserted emoji is part of what is saved.

### Seam 3 — the summary rewrite (new, a pure function)

The optimistic update's only logic, tested without network or React: setting a first
reaction, replacing one (old count down, new up), removing one, removing the last of an
emoji (the entry disappears), and the order of emojis kept. The rollback on error is
TanStack Query's own mechanism and is not retested.

No new Playwright test: e2e runs on demand (`AGENTS.md`).

## Out of Scope

- Several reactions per user on one memo.
- A full emoji picker, custom emojis, or a set the operator can configure.
- Notifications or emails for reactions, and a reaction event on the outbox.
- Reacting by email, or reactions in the comment email.
- Sorting or filtering memos by reactions; reactions in Activity.
- Reactions in the Markdown export.
- Real-time updates of reactions from other readers (they show on the next read).
- Rate limiting reactions.
- Threaded comments, or reacting from the comment strip in the list.
- Paginating the comment section on a memo's page.
- `:shortcode:` autocomplete in the editor. It could come later on the same emoji data,
  through the existing suggestions mechanism; `:` is common in plain text ("10:30",
  `https:`), which needs its own care.
- Counting characters in graphemes. The indicator counts JavaScript code units, so an
  emoji counts 2 or more, while the database limit counts code points: the client is
  always the stricter of the two, and counting graphemes would let it accept content the
  database refuses.
- Recently used or favourite emojis in the picker.

## Further Notes

- **Ticket order.** Comments first, so reactions plug straight into the compact comment
  rather than into the full memo card it replaces. Seven tickets in `issues/`, one
  branch and one PR each: 01 splits the memo card into reusable parts (prefactor), 02
  the comment strip, 03 the comment section, 04 reacting to a memo, 05 reacting to a
  comment, 06 seeing who reacted, 07 emojis in the editor. 01, 02 and 07 can start at
  once; 03 and 04 follow 01; 05 follows 03 and 04; 06 follows 04.
- **No glossary entry for emojis in content.** An emoji in a memo's text is just text,
  not a domain concept — unlike a **Reaction**.
- **Departures from usememos.** usememos allows several reactions per user and stores them
  as a free string validated against an instance setting; we keep one per user and a set
  fixed in code. usememos sends the raw reaction list and groups it in the browser, then
  refetches the whole memo after each click and swallows errors; we send a grouped
  summary and update optimistically, with a rollback that tells the reader. usememos shows
  who reacted only through a hover tooltip, out of reach on touch and of screen readers;
  we add a long press and an accessible label. usememos notifies no one of a reaction
  either — its inbox knows comments, mentions and invitations — which we follow.
- **The fetch problem the strip fixes.** Today, every commented memo in the list loads all
  of its comments to show three. The strip's viewport gate and `limit` are part of the
  redesign, not an optimisation for later.
