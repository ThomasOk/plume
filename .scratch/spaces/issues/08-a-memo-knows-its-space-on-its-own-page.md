# 08 — A Memo knows its Space on its own page

**What to build:** On a Memo's own page, a Memo of a Space behaves as it does in its
Space's list: its Space is named, an admin can moderate it, and editing it suggests the
Space's Tags. Today, on that page, the Memo card cannot tell which Space the Memo belongs
to.

Why it happens: the card takes its Space from the URL — the scope on screen. A Memo's own
page carries no Space in its URL, and reading one Memo does not return its Space, so the
card knows only that the Memo's visibility is `space`. The page is reached from inside a
Space by the Memo's date, "Open", a comment preview's "View all", and a comment
Notification.

Three effects, one cause:

- **Moderation is missing.** The reader's Role is read from the Space in the URL, so on
  this page it is unknown: an admin is not offered to delete another Member's Memo.
- **The Space is not named.** In edit mode the label reads "Space" rather than the Space's
  title (follow-up from ticket 07), and in read mode nothing on the page says the Memo
  belongs to a Space or links back to it.
- **Tag suggestions come from the wrong scope.** Editing on this page suggests the User's
  personal Tags rather than the Space's.

The decision: **the card takes the Space from the Memo, not from the URL.** Reading one
Memo returns its Space; the card resolves that Space — its title and the reader's Role —
the same way it already does on the Space's page. On a Space's page nothing changes: the
Memo's Space and the scope on screen are the same Space. Returning the Space discloses
nothing: only a Member can read a Memo of a Space, and a non-Member still gets the same
answer as for a Memo that does not exist.

Writing on this page is unaffected: there is no memo form on it, only editing and
commenting, and a Comment takes its parent's audience.

To check while implementing, not assumed: whether the Comments listed on this page need
their Space too, for an admin's moderation of Comments to match the Space's page.

**Blocked by:** 07 — Write in the scope you're in.

**Status:** ready-for-agent

- [x] Reading one Memo of a Space returns its Space; a personal Memo returns none
- [x] A non-Member reading a Memo of a Space still gets the same answer as for a missing Memo
- [x] On a Memo's own page, an admin is offered to delete another Member's Memo of the Space
- [x] On a Memo's own page, a `member` is still offered no action on another Member's Memo
- [x] Editing a Memo of a Space on its own page shows the Space's title
- [x] In read mode, the page names the Memo's Space and links to it
- [x] Editing a Memo of a Space on its own page suggests the Space's Tags
- [x] Nothing changes on a Space's page or in the personal scope
- [x] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass

## Comments

**2026-10-08** — Answered while implementing: yes, the Comments listed on a Memo's page
need their Space too. A Comment carries its parent's Space, and the API already resolved
the actor's Role from it, so an admin could delete another Member's Comment through the
API but was not offered it on that page. Every read of Memos now returns the Space, so the
card has one source for it wherever a Memo or Comment is shown.
