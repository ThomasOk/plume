# Spec — An operator deletes public memos

Status: ready-for-agent

> Reference spec for the feature. Decisions here are the contract the implementation
> follows. Companion documents: `docs/adr/0007-the-operator-is-a-flag-on-the-user-granted-out-of-band.md`
> (the operator, amended with this feature), `docs/adr/0004-application-level-tenant-isolation.md`
> (reads by identifier), `docs/adr/0001-comments-are-self-referential-memos.md` (comments).
> Domain vocabulary: `GLOSSARY.md` (**Operator**, **Memo**, **Comment**, **Visibility**,
> **Explore**). Follows `.scratch/featured-memos/spec.md`, which listed moderation of
> Explore as its natural next step.

## Problem Statement

Explore is readable by anyone, signed in or not, and any user can put a memo on it by
making it public, or comment on any public memo. The people running Plume have no way to
take down what should not be there — spam, abuse, something illegal — short of editing the
database by hand. The operator role exists, but it only lets them feature memos: it can
push a memo to the top of Explore, never take one off it.

There is a second gap behind the first. Deleting a memo today removes its attachments'
records but leaves the files themselves in storage, still served at their public address.
Even a memo deleted by hand leaves its images online for anyone holding the link, which
makes taking down an illegal image impossible from the app.

## Solution

An operator may **delete** another user's public memo, or a comment on a public memo, the
same way its author would. It is the existing delete, with one more person allowed to call
it: the memo is gone for good, and its comments go with it. Nothing is said to the author
and nothing records who deleted it.

The operator's power stops exactly where Explore stops. A private memo and a memo of a
space are out of reach — an operator cannot read them, so to them they do not exist —
whether or not the operator is a member of that space; inside a space they are a member
of, they have their role there and nothing more.

Every deletion of a memo, by its author, a space admin or an operator, now also removes its
attachments' files from storage, and those of its comments, so a deleted memo leaves
nothing reachable behind.

## User Stories

### Deleting as an operator

1. As an operator, I want to delete another user's public memo, so that I can take abusive or illegal content off Explore.
2. As an operator, I want to delete another user's comment on a public memo, so that I can remove abuse posted under any memo Explore shows.
3. As an operator, I want to delete a comment on my own public memo whoever wrote it, so that I can keep my announcements' threads clean.
4. As an operator, I want to delete a public memo that is featured, so that featuring a memo never protects it from removal.
5. As an operator, I want the Delete action in the menu of any public memo shown to me — on Explore, on the memo's own page, and in its comments — so that I can act where I see the problem.
6. As an operator, I want the same confirmation dialog as for any deletion, naming the memo's author, so that I never delete someone's memo by a slip.
7. As an operator, I want a deletion to be final, so that removed content cannot resurface.
8. As an operator, I want deleting a memo already deleted to answer as if it did not exist, so that a double click or a retry is harmless.

### Limits of the role

9. As an operator, I want to be unable to delete a private memo, so that running the instance never means reaching into someone's personal notes.
10. As an operator, I want to be unable to delete a memo of a space I am not a member of, so that being an operator grants nothing inside a space.
11. As an operator who is a member of a space, I want my powers there to be those of my space role only, so that operating the instance and governing a space stay separate.
12. As an operator, I want a memo I cannot read to answer exactly like a missing one, so that the delete operation cannot be used to probe for memos.
13. As an operator, I want to be unable to edit another user's public memo, so that moderation removes content and never puts words in someone's mouth.
14. As a user who is not an operator, I want no Delete action offered on another user's public memo, so that the interface offers exactly what the server allows.
15. As a user who is not an operator, I want to be refused if I call the delete operation on another user's public memo anyway, so that the rule holds without the interface.
16. As the person running Plume, I want a revoked operator to lose the power to delete once their session refreshes, so that taking the role back takes the power back.

### Being the author of a deleted memo

17. As an author, I want my memo deleted by an operator to disappear from Explore, from my personal list and from its own page, so that a removal is complete.
18. As an author, I want the comments under my deleted memo to disappear with it, so that no thread is left hanging without its memo.
19. As an author, I accept that I am not notified when an operator deletes my memo, so that removal stays as simple as deleting is today.
20. As an author, I want my private memos and my spaces' memos never to be touched by an operator, so that only what I made public is subject to moderation.
21. As an author whose memo was public, then made private, I want an operator to be unable to delete it, so that taking a memo off Explore puts it back out of their reach.

### Files of a deleted memo

22. As an author, I want deleting my memo to delete its attached files too, so that what I removed is no longer reachable by its link.
23. As an operator, I want deleting an abusive memo to delete its attached files, so that an illegal image does not stay online after its memo is gone.
24. As an author, I want deleting my memo to delete the files attached to its comments, so that nothing of the thread stays online.
25. As a space admin, I want deleting a member's memo to delete its files, so that moderation in a space is complete too.
26. As a user deleting a memo, I want the deletion to succeed even if removing a file from storage fails, so that a storage outage never keeps a memo alive.
27. As a user deleting a memo without attachments, I want nothing to change from today, so that the common case stays as fast as it is.

## Implementation Decisions

### Domain model

- No new glossary term: the action is **delete**, the existing operation. **Operator** is
  widened in `GLOSSARY.md` to include deleting another user's public memo or a comment on
  one, and to state the role grants nothing over a memo that is not public; "moderator"
  joins its _Avoid_ list.
- Deletion stays a hard delete. Unpublishing (making the memo private) was rejected: it is
  an edit, and nobody edits another user's memo.
- The operator's reach is exactly what Explore exposes: a memo whose visibility is public.
  A comment shares its parent's visibility, so a comment on a public memo is public too.

### Policy

- A new pure policy function in the operator policy, beside the one deciding who may feature,
  answers whether an actor may delete a memo as an operator. It decides from two facts: the
  actor's operator flag, and whether the memo is public. Authorship and space role do not
  count. It is exported to the web client the same way as the feature policy.
- The space policy is untouched and never consults the operator flag (ADR 0007, as amended).
  The delete operation, on the server and in the memo card, allows the action if the space
  policy's delete rule **or** the new operator rule allows it.
- The trade-off: the combination is written in two places (the delete service and the memo
  card) instead of once inside the space policy. Accepted to keep the instance-level role
  out of the space role matrix, which is what ADR 0007 promises.

### API contracts

- No new procedure. The existing memo delete keeps its input (the memo's identifier) and its
  return value. It now reads the actor's operator flag from the session, as `feature` does.
- The memo to delete is still read through the reader's readability condition (ADR 0004):
  a memo the operator cannot read answers "not found", so a private memo or a memo of a
  space they are not a member of is refused exactly as a missing memo, never as forbidden.
  A readable memo the operator may not delete (not public, not theirs, and no space role
  allowing it) is refused as forbidden, as today.
- Comments still go with their memo through the existing cascade; notifications pointing at
  the deleted memo go with it, as today.

### Files in storage

- Every deletion through the memo delete operation, whoever calls it, removes the files of
  the memo's attachments and of its comments' attachments from storage.
- The storage keys are read before the rows are deleted (the cascade removes the attachment
  records with the memo), and the files are removed once the deletion has committed.
- File removal is best-effort: a failure is logged and does not fail or undo the deletion.
  The memo is the source of truth; an orphaned file is a smaller harm than a memo that
  cannot be deleted.

### Interface

- The memo card's Delete item is shown when the space policy's delete rule or the operator's
  delete rule allows it, wherever the card is shown: Explore, the memo's own page, a scope
  list and the comment list.
- The existing confirmation dialog is reused unchanged; it already names another author's
  memo by its author's name.
- No new toast or optimistic update: the existing delete mutation, its invalidation and its
  feedback stay as they are.

### Documentation

- ADR 0007 is amended rather than a new ADR written: the operator also deletes a public memo
  or a comment on one; the role grants nothing over a memo that is not public; the
  operator's powers live in a policy of their own, combined with the space policy by "or"
  for an action both can allow. A new ADR was not warranted: the decision is easy to
  reverse and follows from choices already recorded.

## Testing Decisions

A good test drives the feature through the interface a caller actually uses and asserts
what that caller observes: a memo gone from a list, an operation refused with a given code,
a file key removed from storage, a menu's items. It never asserts on queries, database
mocks or internal helpers. Tests are named in the domain's vocabulary.

### Seam 1 — the tRPC caller against a real Postgres (existing)

The seam of the featured-memos and space-memos integration tests (Testcontainers). The
fake storage of the test helpers today ignores deletions; it gains a way to record the keys
it was asked to delete, and to fail on demand. Covers:

- an operator deletes another user's public memo, and another user's comment on a public memo; the memo is gone from Explore and from its author's list;
- the memo's comments are gone with it;
- an operator is answered "not found" on another user's private memo and on a memo of a space they are not a member of;
- an operator who is a member of a space keeps exactly their space role's powers there;
- a user who is not an operator is refused as forbidden on another user's public memo;
- a memo made private again is out of an operator's reach;
- a featured memo can be deleted by an operator;
- deleting a memo removes the files of its attachments and of its comments' attachments, whoever deletes it (author, space admin, operator);
- a storage failure while removing a file does not fail the deletion, and the memo is gone.

Prior art: the featured-memos integration test (operator caller, refusals by code), the
space-memos integration test (an admin deleting a member's memo), the attachments
integration test (attachment rows and storage keys).

### Seam 2 — the operator policy (existing)

The pure-function test of the operator policy. Covers the decision table of the new rule:
operator or not, public or not.

### Seam 3 — the memo card (existing)

The component seam of the memo card tests. Covers: an operator is offered Delete on another
user's public memo and on another user's comment on a public memo; an operator is not
offered Delete on another user's memo that is not public; a user who is not an operator is
not offered Delete on another user's public memo.

Prior art: the memo card tests for featuring (menu items gated by the operator policy).

No new end-to-end test: Playwright runs on demand, and the three seams cover every rule.

## Out of Scope

- **Telling the author.** A notification refers to its memo and is deleted with it, so
  telling an author their memo was removed needs a notification type that outlives the memo,
  with a snapshot of what was removed. A feature of its own.
- **A moderation log** — recording who deleted what. As with featured memos, nothing records
  who acted. Trigger: a second operator, or an author asking where their memo went.
- **Unpublishing** — making another user's memo private instead of deleting it.
- **Any operator power inside a space**, or over a private memo.
- **Banning or suspending a user.**
- **Removing files when a space or an account is deleted.** Both remove memos through a
  database cascade, not through the memo delete operation, and leave their files in storage
  as they do today.
- **Cleaning up files already orphaned** by past deletions.

## Further Notes

- A featured memo deleted by an operator simply leaves Explore; nothing else references it.
- Because the session is cached for five minutes (ADR 0007), a newly granted operator may
  wait that long before seeing the Delete action, and a revoked one may keep it as long.
- The operator remains an ordinary user everywhere else: their own memos, their spaces and
  their comments follow the usual rules.
