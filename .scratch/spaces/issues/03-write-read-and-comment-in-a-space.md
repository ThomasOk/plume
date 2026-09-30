# 03 — Write, read and comment on Memos in a Space

**What to build:** A Member writes a Memo into a Space, every Member reads it with its
Author's name, and Members discuss it in Comments. This is the ticket that makes a Space
worth having.

The audience control:

- **One flat list** — private, public, then each Space the User is a Member of. It is not a
  visibility picker plus a Space picker, and it needs no function to hide illegal
  combinations, because the model has none. (For contrast, the reference implementation
  needs both a sub-menu and a filter function precisely because its two axes are
  independent.)
- Writing from inside a Space defaults to that Space. The current context is the answer;
  there is no remembered "last used Space".
- The list offers only Spaces the User is a Member of.

Reading:

- Every Member reads every Memo in the Space, whoever wrote it, with the Author shown.
- A non-Member gets nothing — not an error disclosing the Memo exists.
- A Space's Memos never appear in their author's personal views, and never on Explore.

Two things that are **mandatory in this ticket, not follow-ups**:

- **Comments inherit the parent's Space** alongside its visibility, which the creation path
  already does for visibility. Without it, the first Comment on a Space Memo violates the
  `CHECK` constraint from ticket 01. Commenting on a Space's Memo is restricted to its
  Members. The Author is still the only one notified — not every Member; notifying a whole
  team on every Comment is what makes notifications unusable.
- **Attachments obey the Memo's audience.** Whoever may read the Memo may read its file;
  everyone else is refused. Shipping the write path without this would publish every Space
  Memo's attachments to the world. The Attachments page itself stays personal — it lists
  what the signed-in User uploaded, in every context, because an Attachment has its own
  owner and is not derived from Memos.

**Blocked by:** 02 — Create a Space and navigate into it.

**Status:** ready-for-agent

- [ ] The audience control is one flat list: private, public, then the User's Spaces
- [ ] Writing from inside a Space puts the Memo in that Space by default
- [ ] A Member reads every Memo of the Space, with its Author displayed
- [ ] A non-Member gets the same answer as for a Memo that does not exist
- [ ] A Space's Memos are absent from the author's personal views and from Explore
- [ ] Creating a Memo with visibility `space` and no Space is refused
- [ ] Creating a Memo in a Space with visibility `private` or `public` is refused
- [ ] A Comment inherits its parent's Space and visibility
- [ ] A non-Member cannot comment on a Space's Memo
- [ ] A Comment on a Space's Memo notifies its Author, and only its Author
- [ ] A Member can read an Attachment on a Space's Memo
- [ ] A non-Member is refused that Attachment
- [ ] The Attachments page still lists the signed-in User's own uploads
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
