# Spec — Featured memos on Explore

Status: ready-for-agent

> Reference spec for the feature. Decisions here are the contract the implementation
> follows. Companion documents: `docs/adr/0006-a-pin-belongs-to-its-scope.md` (the pin,
> whose mechanics Featured reuses), ADR 0007 to be written with this feature (the
> operator). Domain vocabulary: `CONTEXT.md` (**Featured**, **Operator**).

## Problem Statement

Explore is the first page a newcomer sees, readable without signing in, and it is strictly
chronological. The people running Plume have no way to put anything in front of those
readers: an announcement of a new feature, a memo explaining what Plume is for, or a
user's public memo that shows the product at its best sinks under the next public memo
anyone writes. The only lever today is a hard-coded banner, changed by a deployment.

The pin does not answer it, by design: a pin belongs to a scope, and Explore is no one's
scope, so Explore ignores pins (ADR 0006). Letting authors' pins rule Explore would let any
author take the top of the public page.

There is also no notion, anywhere in Plume, of someone who runs the instance. The only
roles are those of a space. Nobody can act on what belongs to no scope.

## Solution

Introduce the **operator**: a user who runs the Plume instance and acts on what belongs to
no scope. Being an operator grants nothing inside a space they are not a member of. The
role is granted and revoked outside the app, by a command run against the database; no
screen grants it.

An operator may **feature** any public memo, whoever wrote it. Featured memos come first
on Explore, latest featured on top, for every reader of Explore, signed in or not, and
carry a visible mark there and on the memo's own page. A filter on Explore narrows the
list without changing its order. Featuring is curation, not an edit: it changes where the
memo stands, not what was written.

A memo that stops being public — edited to private, or moved into a space — stops being
featured, and becoming public again does not feature it back. Featured has no effect
outside Explore, just as a pin has no effect on Explore: the two orderings are
independent.

## User Stories

### Being an operator

1. As the person running Plume, I want to make my own account an operator with one command, so that I can curate Explore without editing the database by hand.
2. As the person running Plume, I want the command to show me the name and email of the account it is about to change, so that I can check it is the right one before it acts.
3. As the person running Plume, I want to designate the account by its user identifier rather than its email, so that nobody can obtain the role by signing up with my email address first.
4. As the person running Plume, I want granting the role twice to change nothing, so that re-running the command is safe.
5. As the person running Plume, I want granting the role to an unknown identifier to fail clearly, so that a typo never passes silently.
6. As the person running Plume, I want to revoke the role with a matching command, so that I can take it back from an account.
7. As a user signing up, I must not be able to declare myself an operator in the sign-up request, so that the role can only come from the person running Plume.
8. As an operator, I want my role to reach the app through my session, so that the interface offers me operator actions without an extra request.
9. As an operator, I accept that a role granted or revoked may take a few minutes to apply, so that sessions can stay cached.
10. As an operator, I want my role to grant me nothing inside a space I am not a member of, so that running the instance never means reading teams' memos.

### Featuring a memo

11. As an operator, I want to feature one of my public memos, so that newcomers see my announcement first on Explore.
12. As an operator, I want to feature another user's public memo, so that I can showcase what Plume makes possible.
13. As an operator, I want to unfeature a memo, so that an outdated announcement leaves the top of Explore.
14. As an operator, I want featuring a memo already featured to change nothing, so that a double click or a retry never reorders Explore.
15. As an operator, I want unfeaturing a memo that is not featured to change nothing, so that the action is safe to repeat.
16. As an operator, I want the memo I featured last to come first among the featured, so that the latest decision is the most visible.
17. As an operator, I want re-featuring a memo to keep its original date, so that a memo never climbs back to the top on its own; to bring it back on top I unfeature then feature it.
18. As an operator, I want to feature as many memos as I need, so that no arbitrary cap gets in my way.
19. As an operator, I want to be refused when I try to feature a private memo or a memo of a space, so that featuring can never reveal a memo to readers who may not read it.
20. As an operator, I want to be refused when I try to feature a comment, so that only memos that stand on their own on Explore are featured.
21. As an operator, I want a memo I cannot read to answer as if it did not exist, so that featuring cannot be used to probe for memos.
22. As an operator, I want the Feature / Unfeature action in the menu of any public memo shown to me — on Explore, on the memo's own page, and in my personal list — so that I can feature my announcement right where I wrote it.
23. As an operator, I want a confirmation toast after featuring or unfeaturing, so that I know the action took effect even when the memo moves out of sight.
24. As an author, I want my memo's last-updated date to stay unchanged when it is featured or unfeatured, so that its history shows only changes to its words.
25. As a user who is not an operator, I want no Feature action offered to me, so that the interface offers exactly what the server allows.
26. As a user who is not an operator, I want to be refused if I call the feature operation anyway, so that the rule holds without the interface.

### Reading Explore

27. As a newcomer who has not signed in, I want featured memos first on Explore, so that I discover what the people running Plume want me to see.
28. As a signed-in user, I want to see the same featured memos, so that someone who just created their account does not lose the announcements.
29. As a reader of Explore, I want a "Featured" mark on featured memos, so that I understand why they come first.
30. As a reader of Explore, I want the rest of Explore to stay newest first below the featured memos, so that the public feed keeps its meaning.
31. As a reader filtering Explore by tag, search or day, I want featured memos that match the filter to stay first and the others to disappear, so that one ordering rule holds whatever the filter.
32. As a reader of a featured memo's own page, I want the "Featured" mark there too, so that a shared link carries the same signal.
33. As an author whose public memo is featured, I want it to stay featured when I edit it and it stays public, so that fixing a typo does not undo the operator's decision.

### Leaving Explore

34. As an author, I want my featured memo to stop being featured when I make it private, so that it never resurfaces on Explore without someone deciding it again.
35. As an author, I want my featured memo to stop being featured when I move it into a space, so that a featured mark never sits on a memo Explore cannot show.
36. As an author, I want my memo to stay unfeatured when I make it public again, so that a past decision does not silently come back.
37. As an author, I want making my memo non-public to be my way of refusing to be featured, so that no extra setting is needed.
38. As an author, I want my featured memo to leave Explore when I delete it, so that nothing of it remains featured.

### Independence from pins and from the role

39. As an author, I want featuring my memo to leave my personal list's order unchanged, so that only my pins arrange my scope.
40. As a member of a space, I want Featured never to touch my space's list, so that a space's order is decided by its admins' pins alone.
41. As an operator, I want a memo to be pinned in its author's scope and featured on Explore independently, so that each ordering answers to whoever governs it.
42. As the person running Plume, I want featured memos to stay featured when the operator who featured them loses the role, so that a featured memo belongs to Explore, not to whoever featured it.

## Implementation Decisions

### Domain model

- Two new glossary terms, already in `CONTEXT.md`: **Operator** and **Featured**. "Admin" stays the name of a space role and is never used for the operator.
- Featuring is curation, not an edit, exactly as pinning is (ADR 0006). The difference is only who decides: the operator, instead of whoever governs the memo's scope.
- A featured memo is always public. The invariant "featured implies public" is kept by every write that can take a memo out of `public`, not by readers filtering it afterwards.

### Schema

- The user gains a boolean `is_operator`, not null, default false. A boolean rather than a role enum: there is one instance-level capability, and "role" already names the space roles. Turn it into an enum the day there are several instance levels.
- The user table belongs to Better Auth, so the column is declared as an additional user field in the auth configuration, **not writable by the client** (`input: false`). This is the security-critical line of the feature: without it, sign-up accepts the field and anyone can register as an operator. Follow the auth schema workflow in `CLAUDE.md`: regenerate the auth schema, fix its style, then generate and apply the migration.
- The memo gains a nullable `featured_at` timestamp: null means not featured; the date orders the featured memos by the latest decision. Excluded from the memo insert schema, like `pinned_at`.
- Both migrations are additive (a defaulted column, a nullable column), safe for the pre-deploy migration step of ADR 0005.
- No record of who featured a memo: a featured memo belongs to Explore, and revoking an operator leaves their featured memos featured.

### Who is an operator

- The server reads the role from the session (`isOperator` on the session's user), as Better Auth exposes additional user fields. The web client infers the same field into its session type, so the interface knows without an extra request.
- Session cookie caching (five minutes) delays a grant or a revocation by up to that long. Accepted for an instance with a single operator; an urgent revocation means revoking the account's sessions.
- The role is granted and revoked by two idempotent commands run against the target database (in production, through the hosting platform's environment), taking a **user identifier**, never an email: sign-up does not verify email addresses, so an email does not prove identity. Each command prints the name and email of the account it changes, and fails on an unknown identifier. Each command is a thin shell over a grant function and a revoke function, which hold the behaviour and are what the tests exercise.
- Being an operator grants nothing in a space: no membership check consults the operator flag.

### Actions: the policy

- A pure policy function decides who may feature or unfeature, alongside the role matrix and exported to the web client the same way, so the interface offers exactly what the server allows. It answers from the actor's operator flag alone; authorship and space role do not count.
- Featuring requires the memo to be public and not a comment. A non-public memo or a comment is refused as a bad request; a memo the operator cannot read answers exactly like a missing one (ADR 0004's reads by identifier).

### API contracts

- Two new memo procedures, `feature` and `unfeature`, each taking only the memo's identifier, available to any signed-in user and refusing non-operators as forbidden. Each names the state it wants rather than toggling: featuring a featured memo keeps its `featured_at`; unfeaturing an unfeatured memo changes nothing. Neither touches `updatedAt`. Both return success, like `pin` and `unpin`.
- `featuredAt` is returned on every memo row shape (lists, Explore, a memo by identifier, comments), as `pinnedAt` is: one row shape for every read.
- Explore's list orders by `featured_at` descending with nulls last, then by creation date descending, filtered or not. Scope lists keep their order (pinned first) and ignore `featured_at`; Explore keeps ignoring `pinned_at`.
- The memo edit clears `featured_at` when the new visibility is not public, in the same statement. The memo move always clears it (a move takes a public memo into a space, or a space memo out of one, which was not featured). An edit that keeps the memo public leaves it featured.

### Interface

- A "Feature" / "Unfeature" item in the memo card's actions menu, offered when the session's user is an operator, the memo is public and it is not a comment — wherever the card is shown, Explore included.
- A "Featured" mark in the card's header, shown on Explore and on the memo's own page only; scope lists do not show it, so it never sits next to a pin mark where it does not decide the order.
- Mutations invalidate the memos queries, as the other memo mutations do; no optimistic update. A confirmation toast on success, the error message on failure. The existing list animation carries the reorder.

### Documentation

- ADR 0007, *The operator is a flag on the user, granted out of band*: the boolean on the user table, `input: false`, the session as carrier and its cache delay, the grant commands by identifier. Rejected options: an allowlist of identifiers in the server's environment (no schema change, but the person running Plume preferred the role to live with the account), Better Auth's admin plugin (ban and impersonation columns nobody needs, and a role literally named `admin`, which collides with the space role), and a separate operators table.
- Featured gets no ADR of its own: it reuses ADR 0006's mechanics, which the code comments cite.

## Testing Decisions

A good test here drives the feature through the interface a caller actually uses and asserts what that caller observes: a list's order, an operation refused with a given code, a session's contents, a menu's items. It never asserts on queries, mocks of the database or internal helpers. Each decision of this spec maps to at least one test, named in the domain's vocabulary.

### Seam 1 — the tRPC caller against a real Postgres (existing)

The seam of the pinned-memos, space-memos and memos integration tests (Testcontainers). The authenticated caller helper gains an option to make the forged session's user an operator. Covers:

- an operator features a public memo of their own and one of another user; a non-operator is refused as forbidden;
- a private memo, a memo of a space and a comment are refused as bad requests; a memo the operator cannot read answers "not found";
- Explore's order: featured first, latest featured on top, then newest first; unchanged by a tag, search or date filter; Explore still ignores pins;
- scope lists ignore `featured_at`;
- idempotence of both operations, the original `featured_at` kept on re-featuring, `updatedAt` untouched;
- an edit to private and a move into a space unfeature the memo; an edit that keeps it public does not; making it public again does not feature it back;
- a featured memo stays featured after its operator's role is revoked.

Prior art: the pinned-memos integration test (same shape of rules, ordering and idempotence assertions), the space-memos integration test (moves and refusals).

### Seam 2 — the Better Auth instance against the test database (new)

This seam proves what seam 1 takes for granted: that the session tells the truth about the role. No test mounts Better Auth today; this one builds the auth instance on the Testcontainers database and drives it through its server API, which is what the HTTP routes call. Covers:

- a sign-up whose body claims `isOperator: true` creates a user who is not an operator — the test of `input: false`;
- after the grant function, the user's session says they are an operator; after the revoke function, it says they are not;
- granting twice changes nothing; granting to an unknown identifier fails.

The commands themselves are tested through the grant and revoke functions they call; the rest of the commands is argument parsing and printing.

### Seam 3 — the memo card (existing)

The component seam of the memo card tests. Covers: an operator is offered Feature on a public memo and Unfeature on a featured one, and calls the operation with only the memo's identifier; a non-operator is offered neither; nobody is offered them on a non-public memo; the mark shows where Explore's rules apply and not in a scope list.

Prior art: the memo card tests for pinning (menu items gated by the policy, mutation called with the identifier, `ignorePins`).

No new end-to-end test: Playwright runs on demand, and the three seams cover every rule.

## Out of Scope

- **Moderation of Explore** — an operator unpublishing or deleting another user's public memo. The natural next use of the operator role, with its own questions (unpublish or delete, telling the author, the fate of comments).
- **Granting the role from the interface** — no screen lists or appoints operators. Trigger: a second person to appoint without database access.
- **An author's explicit opt-out of being featured** — making the memo non-public is the opt-out.
- **A cap on the number of featured memos.**
- **Recording who featured a memo.**
- **Any operator power inside spaces.**
- **Changes to the signed-out banner on Explore**, which stays as it is, for signed-out readers only.
- **Profile pages** (one author's public feed), which Plume does not have.

## Further Notes

- The operator's own announcements are ordinary public memos: written in their personal scope, they can also be pinned there, independently of being featured.
- A featured memo can collect comments from signed-in readers like any public memo; that is part of why an announcement is a memo rather than static content.
- After deploying, the person running Plume grants themselves the role once in production with the grant command, using their user identifier.
