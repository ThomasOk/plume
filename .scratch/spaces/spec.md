# Spec — Spaces: shared memo containers

Status: ready-for-agent

> Reference spec for the feature. Decisions here are the contract the implementation
> follows. Companion documents:
> `docs/adr/0003-spaces-are-containers-not-tenants.md` (the domain shape and its rejected
> alternatives), `docs/adr/0004-application-level-tenant-isolation.md` (how the rule is
> enforced). Domain vocabulary: `CONTEXT.md`.

## Problem Statement

Plume is a single-user tool. A User writes Memos, marks some `public`, and that is the
whole model: the only authorization rule in the product is "is this Memo mine". There is
no way for two people to write into the same place. A User who wants to keep team notes
alongside personal ones has to choose between keeping everything private — and re-sending
it by other means — or publishing to Explore, where the whole internet reads it.

The codebase has the matching gap. Authorization is written by hand at roughly ten call
sites in the memos service, plus one in the attachments service that guards only
`private`. Adding any shared surface on top of that shape multiplies the hand-written
conditions rather than factoring them, and the first forgotten condition is a leak
between teams rather than a cosmetic bug.

The developer also needs this feature as portfolio evidence: multi-user authorization and
tenant scoping are the first technical questions asked in interviews for B2B SaaS and
internal-tooling roles, and the repo currently cannot speak to either.

## Solution

A **Space** is a container of Memos shared by several Users. A Memo belongs to at most one
Space; a Memo in no Space is **personal**. Spaces sit *beside* personal Memos rather than
underneath them — the User remains the root of the model.

**Visibility** gains a third value. A Memo is `private` (its Author alone), `space` (the
Members of its Space), or `public` (everyone, on Explore). Placement and audience are one
decision, not two, enforced by a database constraint:

```
visibility = 'space'  ⟺  space_id IS NOT NULL
```

A Space is a navigation context: `/` lists personal Memos, `/spaces/:id` lists a Space's.
The sidebar carries a switcher, and every derived view — Tag tree, Activity calendar,
Memo count — takes the subject of whatever is in scope. The form writes into the scope on
screen: a Memo written from within a Space goes into that Space, with no choice offered
and no hidden state, and a Memo written from the personal scope stays personal.

Each Member holds a **Role**. An `admin` governs the Space and its membership; a `member`
writes and governs only their own Memos. Neither may edit another Member's Memo. Members
join by **Invitation**: an admin invites an email address, the invitee follows a link, and
the Invitation ceases to exist once accepted.

## User Stories

### Writing and reading

1. As a User, I want my existing Memos to stay exactly where they are when Spaces ship, so that I lose nothing and relearn nothing.
2. As a User, I want a Memo I write outside any Space to remain personal and private by default, so that the safe case stays the default case.
3. As a User, I want the form to write into the scope I am looking at, so that the Memo I just wrote appears in the list I wrote it in.
4. As a Member, I want a Memo I write from inside a Space to land in that Space with no audience choice offered, so that writing for the team cannot be turned into something else by a stray click.
5. As a Member, I want the form inside a Space to show that Space's title, so that I know who will read what I write before I save it.
6. As a User, I want the form in my personal scope to offer only private or public, so that a team Memo is written where the team reads it rather than addressed from elsewhere.
7. As a Member editing one of my Memos in a Space, I want to see the Space's title, as when writing, so that writing and editing say the same thing about where the Memo lives.
8. As a User, I want each scope to keep its own Draft, so that a note I started for myself never reappears, pre-filled, in a Space where one keystroke would publish it to the team.
9. As a Member, I want to read every Memo in my Space regardless of who wrote it, so that the Space is genuinely shared.
10. As a Member, I want to see each Memo's Author in the Space, so that I know who wrote what.
11. As a User, I want to move one of my Memos from personal into a Space, and back, so that a note that turns out to be team business can become team business.
12. As a User, I want moving a Memo out of a Space to make me choose its new audience, so that a Memo never silently changes who can read it.
13. As a User, I want a Memo in a Space to be impossible to mark public, so that nothing written for my team can reach Explore by accident.
14. As a User, I want a Memo in a Space to be impossible to mark private, so that a Memo in a shared container is never invisible to the people sharing it.
15. As a User who is not a Member, I want a Space's Memos to be completely absent — not merely hidden behind an error — so that their existence is not disclosed.

### Navigating

16. As a Member, I want a Space switcher in the sidebar, so that I can move between my personal Memos and each of my Spaces.
17. As a Member, I want the Space I am in to be part of the URL, so that I can bookmark it and share the link with a colleague.
18. As a Member, I want the Tag tree in a Space to show the Tags used by every Member, so that the Space has one shared vocabulary.
19. As a Member, I want filtering by a Tag inside a Space to search only that Space, so that results never mix contexts.
20. As a Member, I want the Activity calendar in a Space to aggregate every Member's writing as a single count per day, so that the page has one subject and no per-person breakdown.
21. As a User, I want my personal views to exclude my Space Memos, so that "my notes" means my notes.
22. As a User, I want search inside a Space to cover only that Space, so that a search never leaks across containers.
23. As a visitor, I want Explore to be unchanged, so that the public page keeps showing individual public Memos and no team content.

### Creating and governing a Space

24. As a User, I want to create a Space with a title, so that I have somewhere to put shared notes.
25. As the creator of a Space, I want to be its first admin automatically, so that I can invite people immediately.
26. As an admin, I want to rename a Space, so that its name can follow what the team actually does.
27. As an admin, I want to see the list of Members and their Roles, so that I know who has access.
28. As an admin, I want to promote a Member to admin, so that governance survives my absence.
29. As an admin, I want to demote another admin to member, so that a mistaken promotion is reversible.
30. As an admin, I want to remove a Member, so that someone who left the team loses access.
31. As an admin, I want removing a Member to leave their Memos in the Space, so that the team keeps its work.
32. As a Member, I want to leave a Space on my own, so that I am not stuck in a group I no longer belong to.
33. As the last admin, I want to be refused when I try to leave or demote myself, so that a Space can never end up ungovernable.
34. As an admin, I want to delete a Space, with an explicit confirmation naming what will be destroyed, so that I cannot do it by reflex.
35. As a member, I want the governance actions to be absent from my interface, not merely to fail, so that I am not offered what I cannot do.

### Inviting

36. As an admin, I want to invite someone by email address, so that I can invite a colleague who has no Plume account yet.
37. As an admin, I want to choose the Role the invitee will receive, so that I do not have to promote them in a second step.
38. As an invitee, I want an email with a link, so that I can join without being told to go and find something.
39. As an invitee without an account, I want to sign up and land in the Space in one flow, so that the Invitation is not lost on the way.
40. As an invitee with an account, I want to accept while signed in, so that I join in one click.
41. As an invitee, I want an expired link to say so plainly and offer nothing else, so that I know to ask for a new one.
42. As an invitee, I want a link that was already used to stop working, so that a forwarded email does not grant access to a stranger.
43. As an admin, I want to see the pending Invitations for my Space, so that I know who has not answered.
44. As an admin, I want to revoke a pending Invitation, so that a mistake or a departure can be undone before it takes effect.
45. As an admin, I want inviting an email that is already a Member to be refused with a clear reason, so that I do not create a duplicate.
46. As an admin, I want re-inviting an address that already has a pending Invitation to replace it rather than stack a second one, so that only one live link exists per address.
47. As a User, I want an Invitation to be honoured on the strength of its link alone, so that nobody can claim it by signing up with my email address.

### Comments and attachments

48. As a Member, I want to comment on a Memo in my Space, so that discussion happens where the Memo is.
49. As a Member, I want my Comment to inherit the parent Memo's Space and visibility, so that a Comment is never more visible than what it answers.
50. As a User who is not a Member, I want commenting on a Space's Memo to be impossible, so that discussion stays inside the Space.
51. As an Author, I want to be notified when someone comments on my Memo in a Space, so that the existing notification behaviour still applies.
52. As a Member, I want an Attachment on a Space's Memo to be readable by the Space, so that shared Memos are not broken images.
53. As a User who is not a Member, I want a Space Memo's Attachment to be refused, so that the file is not a back door around the Memo's audience.
54. As a User, I want the Attachments page to keep listing what I uploaded, everywhere, so that my file library stays mine.

### Safety

55. As an admin, I want to delete a Space and have its Memos and Comments go with it, so that nothing is left orphaned.
56. As a User, I want an admin to be unable to edit my Memo, so that nothing is ever published under my name that I did not write.
57. As a developer, I want a query that reads Memos without declaring a scope to fail to compile, so that the leak is caught before it ships.

## Implementation Decisions

### Domain model

- A **Space** carries an identifier and a title. No description, no icon, no slug in v1.
- **Membership** is its own relation, keyed by (Space, User), carrying a Role and a join
  timestamp. It has **no status column**: a membership either exists or it does not.
- An **Invitation** is a separate entity with its own lifecycle, keyed by an identifier,
  and carrying the target Space, the invited email, the Role granted on acceptance, a
  hashed token, an expiry, the inviting User, and a creation timestamp. Accepting destroys
  the Invitation and creates the Membership in one transaction.
- The reason Invitation and Membership are **not** merged into one row with a status
  column — the shape usememos uses — is that an Invitation addresses an email, which may
  belong to no User at all, so there is no User to key the row on. That merge is a
  consequence of inviting existing users only, not an independent simplification.
- **Role** is an enum with values `admin` and `member`, not a boolean. `member` is both
  the general term for someone in a Space and the name of the non-admin Role; the glossary
  records the ambiguity rather than hiding it.

### Schema

- `memo` gains a nullable Space reference. The `visibility` enum gains `space`.
- A `CHECK` constraint enforces the equivalence in both directions: a Memo has a Space if
  and only if its visibility is `space`. The implication alone is not enough — it is the
  equivalence that makes `space + private` and `space + public` unrepresentable.
- Deleting a Space cascades to its Memos. Deleting a User continues to cascade to their
  Memos: Plume has no account-deletion feature, so no code path reaches that constraint.
  The ghost-user mechanism that will replace it is recorded in ADR 0003 with its trigger.
- An index supports the dominant read: Memos of one Space, newest first.
- Migrations are generated and committed per the repo's Drizzle workflow; `db:push` is not
  used.

### Reads: the scope

All Memo reads take a scope as a **required parameter**, and a single function turns it
into a SQL condition. This type shape is the decision; it came out of the design session
and is reproduced because prose states it less precisely:

```ts
type MemoScope =
  | { kind: 'personal'; userId: string }
  | { kind: 'space'; spaceId: string };
```

- The personal scope is `author is this user AND the Memo has no Space`. This is a
  behaviour change on the existing personal list, which today filters on the Author alone
  and would otherwise start including the User's Space Memos.
- The Space scope is `the Memo is in this Space`, with no Author condition — that is what
  sharing means.
- The scope condition is written in exactly one place. No call site composes it by hand.
- The same scoping applies to the Memo list, search, Tag tree, Activity, and the Memo
  count. Explore is deliberately outside all scopes and needs no change.

### Actions: the policy

- A **space policy module** holds the Role matrix as pure functions over plain values,
  with no database access. A policy function that needs a database handle is the signal
  that a fact was not resolved upstream.
- The matrix: both Roles read the Space and write Memos in it; both edit and delete their
  own Memos; only an admin deletes another Member's Memo; **neither Role edits another
  Member's Memo**, because deleting is moderation while editing would be impersonation
  under a preserved byline; only an admin manages membership, Roles, the title, and
  deletion; any Member may leave except the last admin.
- A **space tRPC procedure** resolves the facts once per request — is this User a Member of
  this Space, and with which Role — and exposes them on the context, so services do not
  re-query membership. It enforces membership only. It cannot enforce the matrix, because
  it runs before the row is loaded and "may I delete this Memo" depends on who wrote it.
- The services load the row, then ask the policy.

### Invitations

- The token is cryptographically random, stored **hashed**, single-use, and carries an
  expiry. A leak of the table must not yield live Invitations. It is derived — an HMAC of
  the Invitation's random id under the server secret — so that the email subscriber can
  rebuild the link from the id, and no plaintext token ever reaches the outbox.
- **The token is the credential, not the email match.** Auth runs with email verification
  disabled, so accepting an Invitation by comparing the signed-in account's email to the
  invited address would let anyone claim a colleague's Invitation by signing up with their
  address. Holding the link is what grants the Membership.
- Creating an Invitation records a domain event in the outbox **in the same transaction**,
  following the existing pattern. A new subscriber sends the email through the existing
  `EmailSender` port, keyed for idempotency by the outbox row id, exactly as the comment
  email does. **No existing code is modified** — this is a new event type and a new
  subscriber.
- Re-inviting an address that already has a pending Invitation replaces it, so at most one
  live link exists per address per Space.
- Invitations are email only. There is no in-app notification, because the notification
  entity references a Memo by foreign key and generalising that column is its own
  modelling decision.

### Comments and attachments

- A Comment inherits the parent Memo's Space alongside its visibility, which the creation
  path already does for visibility. Without this the equivalence constraint is violated by
  the first Comment on a Space Memo.
- The attachments service's read guard currently tests only `private` and lets everything
  else through. It must become scope-aware, or a Space Memo's Attachments become world-
  readable. This is mandatory scope, not an improvement.
- The Attachments page stays personal — it lists what the signed-in User uploaded, in every
  context. An Attachment has its own owner and is not derived from Memos. Authorization to
  *read* an Attachment, however, follows its Memo: whoever may read the Memo may read the
  file.

### Interface

- `/spaces/:id` scopes the Memo list and every derived view. The sidebar carries a Space
  switcher.
- The form writes into the **scope on screen** (revised, see *Revisions*). Inside a Space
  it offers no audience choice: it shows the Space's title as a non-interactive label, the
  same label shown when editing a Memo of that Space. In the personal scope it offers
  private and public only. Changing a Memo's scope remains the Move operation. There is
  still no visibility picker plus Space picker, and no function hiding illegal
  combinations, because the model has none.
- A **Draft is kept per scope**. The personal scope keeps the existing Draft; each Space has
  its own, so changing scope never carries text into a different audience.
- Governance actions absent, not disabled, for a `member`.
- A members page lists Members with their Roles and the pending Invitations.
- An Invitation acceptance page works signed out, and carries the invitee through sign-up
  into the Space without losing the token.

### Delivery order

The work ships as six pull requests, ordered so the risk is paid early and alone: schema
and migration; the scope refactor with behaviour unchanged; Spaces, Roles and the policy;
Invitations; Memos in Spaces including the move operation; then the interface. The scope
refactor deliberately lands **before** Spaces are reachable, so the existing integration
tests act as the proof that nothing regressed — if it shipped together with the feature, a
red test would no longer say which of the two broke it.

## Testing Decisions

A good test here asserts what a User can and cannot observe through the API: which Memos
come back, which calls are refused, which email goes out. It does not assert the shape of a
SQL clause, the name of an internal function, or the number of queries. Three seams already
exist in the repo and no new one is introduced.

### Seam 1 — the tRPC caller against a real Postgres

Prior art: `memos.integration.test.ts`. Testcontainers starts the database, the router is
driven through `createCaller`, and the authenticated-caller helper already accepts a user
id, so multi-user scenarios need no new tooling. This seam carries the bulk of the
feature:

- **Isolation**, the most important tests in the spec: a non-Member reading, listing,
  searching, commenting on, or attaching to a Space's Memos gets nothing back — and the
  refusal must be indistinguishable from the Space not existing, so a probe cannot confirm
  a Space's existence.
- The personal scope no longer returns the User's Space Memos.
- The Role matrix end to end: a `member` refused on membership management; an admin
  deleting another Member's Memo; an admin **refused** when editing another Member's Memo.
- The last-admin invariant on both paths that can violate it — leaving, and self-demotion.
- Removing a Member leaves their Memos in the Space and preserves the byline.
- Deleting a Space removes its Memos and their Comments.
- The equivalence constraint: creating or updating a Memo into `space` without a Space, or
  into `private`/`public` while in a Space, is refused.
- The full Invitation lifecycle: create, accept, re-accept the same token (refused),
  accept after expiry (refused), revoke then accept (refused), re-invite replacing the
  pending Invitation, invite an existing Member (refused).
- A Comment inherits the parent's Space, and Explore returns no Space content.

### Seam 2 — pure functions

Prior art: `memos-utils.test.ts`. The space policy module only, as a table with one row per
cell of the Role matrix. No database, no mocks. This is where the matrix is *read* by a
future maintainer and compared against the spec.

### Seam 3 — the fake email sender driven through the outbox drain

Prior art: `comment-email.integration.test.ts`. Creating an Invitation then draining the
outbox sends exactly one email; draining again sends no second one, because the fake models
Resend's idempotency contract keyed on the outbox row id. A failing send leaves the row
pending for retry rather than losing the Invitation.

### Explicitly not tested in isolation

The function that turns a scope into a SQL condition. It returns a query fragment, so any
direct assertion is an assertion about implementation: optimising the clause would break a
green test while the behaviour is unchanged. Scoping is proven at seam 1, through what a
User can read.

### Frontend

The interface work is mostly route composition over hooks that the API tests already
cover. The exception is the memo form, which since the revision carries the rule that
places a Memo: it gets one component seam — the memo form rendered with its mutation and
Space hooks mocked, and the scope supplied by mocking the hook that reads it from the URL.
Prior art: `space-actions-menu.test.tsx`. It asserts what a User sees and what gets
created: inside a Space, no audience control, the Space's title, and the Memo created in
that Space; in the personal scope, only private and public offered; a Draft typed in one
scope absent from another; and the same title label when editing a Space's Memo.

One Playwright scenario is added: an admin invites, the invitee accepts, and the invitee
then reads the Space's Memos. The existing scenario that writes from inside a Space asserts
the non-interactive label rather than an audience button, and that the personal scope's
menu does not offer the Space. They run on demand, outside `pnpm test`, per the repo's
definition of done.

## Out of Scope

- **Account deletion**, and with it the ghost-user mechanism. No such feature exists today,
  so the cascade it would interact with is unreachable. Recorded in ADR 0003 with its
  trigger.
- **In-app notifications for Invitations.** Email only. Generalising the notification
  entity's foreign key is a separate modelling decision.
- **Collective publishing.** A Space cannot put a Memo on Explore. Its Author takes it out
  of the Space first, and it becomes personal again.
- **A third Role.** No read-only viewer. Two Roles are the minimum that makes the policy
  layer real.
- **Postgres Row-Level Security.** Rejected with its trigger in ADR 0004. It layers on top
  of the scope later without anything being thrown away.
- **Sharing one Memo with several Spaces.** A Memo belongs to at most one Space.
- **Pagination.** A real and independent problem, untouched here.
- **Space descriptions, icons, and vanity slugs.**
- **Per-Member activity breakdown.** The Space's Activity is a single aggregate count per
  day, deliberately, so that a shared calendar cannot be read as surveillance.

## Further Notes

The reference implementation in `usememos-reference` was studied closely and deliberately
diverged from on three points, each for a stated reason. It keeps visibility and Space
placement as **independent** axes, which forces a reconciliation step on every write — about
thirty lines in its memo store, plus a filter function in the editor to hide the illegal
combinations from the menu. The equivalence adopted here deletes both, and collapses its
two-part audience control — first into one flat list, then, after the revision below, into
no control at all inside a Space. It **merges Invitation into Membership** via a
status column, which only works because it invites existing users. And it aggregates a
shared context's statistics **in the browser**, fetching every Member's stats separately —
a fan-out that grows with membership and hands the client a per-person breakdown the screen
does not need; one `GROUP BY` replaces it.

Its user-deletion path is worth reading as a warning rather than a model: it refuses to
delete a User who is still a Member of any Space, and its deletion routine runs to some
four hundred lines of hand-written, batched, lock-ordered Go — the price of a schema with
almost no foreign keys. Plume declares its cascades in the database, which is why this spec
can leave that problem alone.

## Revisions

### 2026-10-08 — The form writes into the scope on screen

The first version offered one flat audience list — private, public, then every Space the
User belongs to — with the current scope as its default. In use, that let a Member write
from inside one Space into another, or onto Explore, and the Memo then vanished from the
list they were looking at; the same happened from the personal scope towards a Space. The
flat list solved the reference implementation's problem (two axes to reconcile) but kept a
choice the context had already made.

The scope now decides: inside a Space there is no choice, only the Space's title; in the
personal scope the choice is private or public. Moving a Memo between scopes is the Move
operation, unchanged. Removing the visible choice made a shared Draft dangerous — a
personal Draft would reappear, pre-filled, behind a reassuring Space label — so Drafts are
now kept per scope. The equivalence between visibility and Space, and ADR 0003, are
untouched; only who makes the decision at writing time changed. Delivered by ticket 07.
