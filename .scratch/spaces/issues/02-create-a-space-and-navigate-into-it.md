# 02 — Create a Space and navigate into it

**What to build:** A User creates a Space, becomes its first admin, sees it in a sidebar
switcher, and navigates into it. The Space is empty — no Memo can be written into it yet —
but every view inside it is correctly scoped. This is the first demoable milestone.

Behaviour:

- Creating a Space takes a title and nothing else. No description, no icon, no vanity slug.
- The creator becomes a Member with the `admin` Role, in the same transaction as the Space
  itself. A Space is never created without a governor.
- A User sees the Spaces they are a Member of, and no others.
- A **Space procedure** resolves the facts once per request — is this User a Member of this
  Space, and with which Role — and exposes them on the request context, so services never
  re-query membership. It enforces **membership only**. It cannot enforce the Role matrix,
  because it runs before any row is loaded.
- A non-Member asking for a Space gets a response **indistinguishable from the Space not
  existing**. A distinct "forbidden" answer would turn the endpoint into an oracle: probe
  identifiers, learn which Spaces exist.

Navigation:

- The Space is part of the URL, so it can be bookmarked and shared.
- The sidebar carries a switcher between personal Memos and each Space.
- Inside a Space, the Memo list, Tag tree, Activity calendar and Memo count all run on the
  Space scope from ticket 01 — all empty at this stage, which is exactly what proves the
  scope is being applied rather than ignored.
- Renaming and deleting a Space are **not** in this ticket; they arrive with governance in
  ticket 06.

**Blocked by:** 01 — Every Memo read declares its scope.

**Status:** ready-for-agent

- [ ] A User can create a Space with a title and is its `admin`
- [ ] The Space and its first membership are created atomically
- [ ] The Space list returns only Spaces the User is a Member of
- [ ] A non-Member reading a Space gets the same answer as for a Space that does not exist
- [ ] The Space is addressable by URL and survives a reload
- [ ] The sidebar switcher moves between personal Memos and each Space
- [ ] Inside a Space, the Memo list, Tag tree, Activity and count are empty and scoped to it
- [ ] The personal views are unaffected
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
