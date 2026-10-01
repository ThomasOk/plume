# 04 — Move a Memo between scopes

**What to build:** A User takes one of their Memos out of a Space and back into their
personal notes, or the other way round. A note that turns out to be team business becomes
team business, without being rewritten.

The decision that shapes this ticket: because a Memo has a Space **if and only if** its
visibility is `space`, moving is a **single operation**, not two fields edited in sequence.
Any implementation that lets placement and visibility be set independently can pass through
a state the `CHECK` constraint rejects.

- Moving a Memo **into** a Space sets its visibility to `space`. Its Comments and
  Attachments move with it — a Comment may never be more visible than what it answers.
- Moving a Memo **out** of a Space requires choosing its new audience, private or public. A
  Memo never silently changes who can read it.
- Moving a Memo is refused while it carries a Comment by another User, in either
  direction. That Comment was written for the Memo's audience as it stood and, having no
  audience of its own, would follow the Memo onto Explore, into a Space its author is not
  in, or out of its author's reach, without them being asked. Decided while implementing;
  recorded in ADR 0003.
- Only the Memo's Author moves it. An admin may delete another Member's Memo (ticket 06)
  but never relocate or edit it: deleting is moderation, moving is a change to someone
  else's work under a preserved byline.
- The target Space must be one the User is a Member of.

**Blocked by:** 03 — Write, read and comment on Memos in a Space.

**Status:** ready-for-agent

- [x] The Author moves their personal Memo into a Space they belong to
- [x] The Author moves their Space Memo out, choosing private or public
- [x] Moving out without choosing an audience is refused
- [x] Moving into a Space the User is not a Member of is refused
- [x] A User cannot move another Member's Memo
- [x] A moved Memo's Comments follow it and stay consistent with the constraint
- [x] A moved Memo's Attachments follow its new audience
- [x] The Memo leaves the source scope's list, Tag tree, Activity and count, and joins the target's
- [x] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
