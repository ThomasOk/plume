# Spec — Settings

Status: ready-for-agent

> Reference spec for the feature. Decisions here are the contract the implementation
> follows. Companion documents: `docs/adr/0003-spaces-are-containers-not-tenants.md`
> (account deletion and the Former user, amended before this spec),
> `docs/adr/0002-event-driven-notifications-via-transactional-outbox.md` (the comment email
> reaction), `docs/adr/0001-comments-are-self-referential-memos.md` (comments).
> Domain vocabulary: `GLOSSARY.md` (**User**, **Author**, **Former user**, **Memo**,
> **Comment**, **Space**, **Member**, **Role**, **Notification**, **Attachment**,
> **Visibility**). Inspired by the settings of usememos, from which only the sections that
> concern a user's own account were kept.

## Problem Statement

The settings page is a placeholder: "User settings will appear here." A user who signed up
can do nothing about their own account once it exists.

- They cannot fix the name other people see on their memos and comments.
- They cannot change their password, and cannot see where they are signed in, so a
  forgotten session on a shared computer stays open with no way to close it.
- Every comment on one of their memos sends them an email, and nothing turns it off.
- Their notes are locked in: there is no way to take a copy of what they wrote.
- There is no way to leave. Deleting an account is impossible from the app, and if it were
  done by hand in the database, the cascade on a memo's author would take away the memos
  they wrote in spaces — memos the space owns — and the comments they left under other
  people's memos, leaving holes in threads that belong to someone else.

## Solution

`/settings` becomes a page with four sections, each at its own address so a link can
point straight to one, and a side navigation between them. `/settings` itself opens the
first.

- **Account** — the user edits their name.
- **Security** — a user who signs in with a password changes it, giving the current one,
  and may sign out every other device at the same time. Every user sees the devices they
  are signed in on, the current one marked, and signs any of them out, or all but this one.
- **Notifications** — one switch: "Email me when someone comments on my memos", on by
  default. The in-app notification is not affected. Every comment email links to this
  section.
- **Data** — the user downloads a zip of every memo they wrote, as readable Markdown files,
  and, in a danger zone, deletes their account.

Deleting an account takes the user's personal memos with it, and keeps everything that
belongs to someone else: their memos in a space and their comments under another author's
memo pass to the **Former user**, shown as "Deleted user". A user who is the last admin of
a space with other members must first make someone else admin; a space they are alone in is
deleted with them. Deletion asks for the password — or, for an account without one, a
recent sign-in — and for the user's email typed out.

## User Stories

### The page

1. As a user, I want a settings page split into Account, Security, Notifications and Data, so that I find a setting by what it is about.
2. As a user, I want each section to have its own address, so that a link (in an email, in a message) opens the right section directly.
3. As a user, I want `/settings` to open the Account section, so that the menu's Settings entry lands somewhere useful.
4. As a user, I want to move between sections from a side navigation that shows which section I am in, so that I always know where I am.
5. As a user on a phone, I want the section navigation to fit a narrow screen, so that settings are usable on mobile.
6. As a visitor who is not signed in, I want to be sent to sign-in when I open any settings address, so that no one sees or changes an account that is not theirs.

### Account

7. As a user, I want to see my current name and email, so that I know which account I am editing.
8. As a user, I want to change my name, so that my memos and comments carry the name I want.
9. As a user, I want my new name to appear everywhere right after saving, without signing out, so that I trust the change took.
10. As a user, I want an empty or whitespace-only name to be refused, so that I cannot become nameless by mistake.
11. As a user, I want leading and trailing spaces trimmed from my name, so that a stray space does not end up on every memo.
12. As a user, I want an overly long name to be refused with a clear message, so that I know the limit.
13. As a user, I want to see that my email cannot be changed here, so that I do not look for a field that does not exist.

### Security — password

14. As a user who signs in with a password, I want to change it, so that I can replace one I suspect is known.
15. As a user changing my password, I want to be asked for my current one, so that someone using my open session cannot lock me out of my own account.
16. As a user, I want a wrong current password to be refused with a clear message, so that I know what to fix.
17. As a user, I want to type the new password twice, so that a typo does not lock me out.
18. As a user, I want the same minimum length as at sign-up, so that the rule is the same everywhere.
19. As a user changing my password, I want to choose to sign out every other device at the same time, so that whoever knew the old password loses access.
20. As a user who signs in with Google, I want no password form shown, so that I am not offered something that does not apply to my account.

### Security — sessions

21. As a user, I want to see every device I am signed in on, with its browser and operating system, so that I recognise my own devices.
22. As a user, I want to see each session's IP address and when it was last active, so that I can spot one that is not mine.
23. As a user, I want the session I am using right now marked "This device", so that I do not sign myself out by accident.
24. As a user, I want to sign out any one of my other sessions, so that I can close a session left open on a shared computer.
25. As a user, I want to sign out all my sessions except this one in one action, so that I can react quickly when I think my account is compromised.
26. As a user, I want a session I signed out to disappear from the list, so that I see the result.
27. As a user, I want a session whose browser cannot be identified to still appear with a generic label, so that no session is hidden from me.

### Notifications

28. As a user, I want a switch to stop the emails I get when someone comments on my memos, so that I am not emailed for every comment.
29. As a user who never touched the switch, I want it on, so that I keep receiving the emails I already received.
30. As a user, I want turning the switch off to stop the emails at once, including for comments posted just before, so that "off" means off.
31. As a user who turned the emails off, I want to keep receiving in-app notifications, so that I still learn about comments when I open Plume.
32. As a user receiving a comment email, I want a link to manage my notifications, so that I can turn the emails off from the email itself.
33. As a user who follows that link while signed out, I want to sign in and land on the Notifications section, so that the link still gets me there.

### Data — export

34. As a user, I want to download every memo I wrote as a zip, so that I keep a copy of my notes outside Plume.
35. As a user, I want my personal memos and the memos I wrote in each space in separate folders, so that the archive mirrors how I organised my writing.
36. As a user, I want each memo as its own Markdown file, named by its date and its first line, so that I can find a memo by browsing the folder.
37. As a user, I want two memos with the same date and first line to get distinct file names, so that no memo overwrites another in the archive.
38. As a user, I want each file to start with its creation and update dates, visibility, tags and, for a space memo, the space's name, so that the archive keeps what the text alone would lose.
39. As a user, I want each file to list the names of its attachments, so that I know which files went with the memo.
40. As a user, I want the memo's Markdown exactly as I wrote it, so that the archive opens as-is in any Markdown editor.
41. As a user, I want only memos I am the author of, so that the archive never contains anyone else's words.
42. As a user, I want my memos in a space included even though the space owns them, so that the archive holds everything I wrote.
43. As a user with no memos, I want the export to still give me a valid, empty archive, so that the action never fails.
44. As a user, I want the download to start straight away from the button, so that exporting is one click.

### Data — account deletion

45. As a user, I want to delete my account from the Data section, so that I can leave Plume.
46. As a user about to delete my account, I want to be told what will be deleted and what will stay, so that I decide knowing the consequences.
47. As a user about to delete my account, I want to type my email to confirm, so that I cannot delete it with a stray click.
48. As a user with a password, I want to be asked for it to delete my account, so that someone using my open session cannot delete it.
49. As a user who signs in with Google, I want to be asked to sign in again if my session is not recent, so that deletion is still protected without a password.
50. As a user, I want my personal memos — private and public — deleted with my account, so that leaving means my own notes are gone.
51. As a user, I want the files attached to my personal memos removed from storage, so that nothing I uploaded stays reachable by its link.
52. As a user, I want to be signed out everywhere once my account is deleted, so that no device keeps a session to a deleted account.
53. As a user who is the last admin of a space that has other members, I want deletion refused and the spaces concerned listed, so that I can make someone else admin first instead of leaving a space with no admin.
54. As a user who is the only member of a space, I want to be warned that the space and its memos will be deleted, so that I am not surprised.
55. As the member of a space, I want the memos a deleted user wrote in our space to stay, so that the space keeps its content.
56. As the author of a memo, I want the comments a deleted user left under it to stay, so that the thread under my memo still reads.
57. As a reader, I want the memos and comments that outlived their author shown as written by "Deleted user", so that I know their author left.
58. As a space admin, I want to be able to delete a memo the Former user now holds in my space, so that content left behind can still be moderated.
59. As an operator, I want to be able to delete a public comment the Former user now holds, so that Explore can still be moderated.
60. As a member commenting on a memo the Former user holds, I want my comment to notify and email no one, so that nothing is sent to an address no one reads.
61. As a user, I want a deletion that fails half-way to change nothing, so that I never end up with a half-deleted account.

## Implementation Decisions

### Page and routing

- Route definitions stay in the web app's routes folder: a settings layout route with a
  child route per section (`account`, `security`, `notifications`, `data`), and
  `/settings` redirecting to `/settings/account`. The layout owns the sign-in guard (the
  existing redirect to sign-in) and the section navigation. On narrow screens the
  navigation becomes a horizontal tab row.
- A new `account` web feature exposes the section components (profile, password, sessions,
  export button, deletion) and their hooks; the email preference switch lives in the
  `notifications` feature. Routes only compose them.

### Account — name

- The name is changed through Better Auth's `updateUser` from the client, not a tRPC
  procedure: it refreshes the cached session cookie (five-minute cache), so the new name
  shows at once. A tRPC update would leave the old name in the session for up to five
  minutes.
- Better Auth enforces nothing on the name, so the auth configuration gains a user-update
  database hook that trims the name and refuses it when empty or longer than 100
  characters. The client validates the same rule with a shared schema for immediate
  feedback; the hook is the authority.

### Security

- Password change and sessions use the Better Auth client only: `changePassword` (current
  password, new password, `revokeOtherSessions`), `listSessions`, `revokeSession`,
  `revokeOtherSessions`. No server code is added.
- Whether the user has a password is read from their linked accounts (`listAccounts`): the
  password form shows only when one of them is the credential provider.
- The user agent is parsed client-side with `bowser` (MIT) into browser and OS. The IP is
  shown as stored; no geolocation.

### Notifications — preference

- New table `user_preference`: one row per user, the user's id as primary key with a
  cascading foreign key, a `comment_emails` boolean not null defaulting to true, and
  `updated_at`. A missing row means every preference has its default, so no row is
  created at sign-up and no backfill is needed. Typed columns, not a key/value store: the
  database holds the defaults and the types.
- tRPC: `preferences.get` returns the user's preferences, defaults filled in when there is
  no row; `preferences.update` upserts.
- The comment email reaction reads the preference at send time, during the drain, not when
  the event is written: turning emails off silences events already waiting in the outbox.
- The comment email gains a footer link to `/settings/notifications`, built from the web
  URL the server already knows (the same configuration the invitation links use). The
  link requires signing in; one-click unsubscribe is out of scope.

### Former user

- A reserved `user` row inserted by a migration, with a fixed id exported from the db
  package (`former-user`), the name "Deleted user", the email `former-user@plume.invalid`
  (a reserved domain, RFC 2606, which also keeps anyone from signing up with it), and no
  `account` row, so it can never sign in. It is never a member of a space.
- Because its name is "Deleted user", every view that shows an author's name needs no
  change.
- The comment recipient policy — shared by the in-app notification and the email
  reactions — returns "don't react" when the recipient is the Former user, so neither
  channel fires for a comment on a memo it holds.

### Account deletion

- A tRPC mutation `account.delete`, Plume's own, not Better Auth's `deleteUser` (ADR 0003:
  Better Auth's `beforeDelete` hook does not share the transaction of the delete, and its
  `freshAge` check is off by a factor of a thousand in the installed version). Input: the
  confirmation email, and the password when the account has one.
- Checks, before anything is written:
  - the confirmation email matches the user's email, compared case-insensitively;
  - if the user has a credential account, the password is verified against its hash with
    Better Auth's own password verification function, so the hashing scheme stays
    Better Auth's;
  - if not, the current session was created less than 10 minutes ago; otherwise the call
    fails with a dedicated "re-authentication required" error and the client asks the user
    to sign in again.
- In one database transaction:
  1. lock the user's memberships and their spaces, the way the last-admin rule already
     locks them against concurrent changes;
  2. if the user is the last admin of any space that has other members, fail with a
     dedicated error mapped to `CONFLICT` that carries those spaces (id and name), so the
     interface can list them;
  3. delete every space in which the user is the only member — its memos go with it;
  4. reassign to the Former user: the user's memos that are in a space, and the user's
     comments under a memo whose author is someone else; and reassign the attachments of
     those memos and comments too — attachments reference their uploader with a cascading
     key, so without this they would vanish with the account while their memo stays;
  5. delete the user row; sessions, accounts, preferences, personal memos (with every
     comment under them, whoever wrote it), their attachments, notifications sent or
     received, and invitations the user sent all cascade.
- Storage keys of every attachment that is deleted (personal memos, their comments, the
  deleted spaces' memos, the user's pending uploads) are collected inside the transaction
  and removed from storage after the commit, the way memo deletion already does: a storage
  failure is logged and does not fail the deletion.
- A pin on a reassigned memo stays (a pin belongs to its scope, not to the author). Events
  still waiting in the outbox that name the deleted user find nothing to react to and do
  nothing.
- The client, on success, clears its session state and sends the user to the sign-in page.

### Data — export

- An archive builder in the api package: given the database and a user id, it returns the
  zip's bytes. The Hono server exposes it as an authenticated `GET` route under the API
  prefix, resolving the session and answering with `Content-Disposition: attachment` and a
  dated file name; the route holds no logic of its own. It is not tRPC because tRPC does
  not return binary bodies.
- Content: every memo whose author is the user and that is not a comment.
- Layout: `personal/` for memos with no space, `spaces/<space-name-slug>/` for each space;
  two spaces whose names give the same slug are told apart by a suffix.
- File name: the memo's creation date (UTC, `YYYY-MM-DD`), a dash, a slug of its first
  non-empty line (Markdown syntax stripped, accents folded, lowercase, at most 50
  characters, `memo` when nothing is left), `.md`; a collision in the same folder adds
  `-2`, `-3`.
- Each file is YAML frontmatter followed by the memo's content byte for byte. Frontmatter
  keys: `created`, `updated` (RFC 3339), `visibility`, `tags` (the extracted tags),
  `space` (name, space memos only), `attachments` (file names, when any). The frontmatter
  is written with a YAML serializer, never by string concatenation, so a tag or a space
  name with a colon or a quote cannot break it.
- The zip is built in memory with `fflate`; the archive holds text only.

## Testing Decisions

A good test drives the feature through the interface a caller actually uses and asserts
what that caller observes: a memo now held by the Former user, an operation refused with a
given code, a storage key removed, an email sent or not, an archive's entries, a form's
fields. It never asserts on queries, database mocks or internal helpers. Tests are named in
the domain's vocabulary.

### Seam 1 — the tRPC caller against a real Postgres (existing)

The seam of the space-governance, space-memos and operator-deletes-memos integration tests
(Testcontainers). The authenticated caller helper gains an option for the session's
creation time; tests insert a credential account with a password hashed by Better Auth's
own function. Covers:

- preferences read as their defaults when the user has none, and an update is read back;
- a deleted user's personal memos are gone, with every comment under them;
- their memos in a space now have the Former user as author and are still listed in the space;
- their comment under another author's memo now has the Former user as author;
- the attachments of a reassigned memo are still attached to it;
- the storage keys of every deleted attachment are removed, and a storage failure does not fail the deletion;
- deletion is refused, and nothing changes, when the user is the last admin of a space with other members; the error names those spaces;
- a space whose only member is the user is gone with its memos;
- a wrong password, a missing password on a credential account, and a confirmation email that does not match are refused, and nothing changes;
- an account without a password is refused with "re-authentication required" when its session is older than 10 minutes, and deleted when it is recent;
- after deletion the user's sessions are gone;
- a space admin can delete a memo held by the Former user.

Prior art: space-governance (the last admin, under concurrent changes), space-memos (an
admin deleting a member's memo), operator-deletes-memos and memo-attachments-storage (the
fake storage recording deleted keys and failing on demand).

### Seam 1b — the archive builder against a real Postgres (new, same harness)

The export builder called directly with the test database, its result unzipped. The Hono
route is a thin adapter and is not tested. Covers: folders per personal and per space;
file names from date and first line, collisions suffixed; frontmatter fields, including a
tag or space name that needs quoting; content byte for byte; comments and other authors'
memos excluded; an empty archive for a user with no memos.

### Seam 2 — the outbox drain (existing)

The seam of the comment-email integration test (`drainOnce` with the fake email sender).
Covers: no email when the recipient turned comment emails off, while the in-app
notification is still created; an email when the preference row does not exist; a
preference turned off after the event was written still stops the email; the email
contains the link to the Notifications section; no notification and no email when the
parent memo's author is the Former user.

### Seam 3 — Better Auth on the test database (existing)

The seam of the operator integration test (`createAuth` driven through its server API).
Covers the name rule: an update with an empty or whitespace-only name, or one over 100
characters, is refused; a name with surrounding spaces is stored trimmed.

### Seam 4 — feature components with React Testing Library (existing)

The seam of the sign-in card and memo form tests. Covers: the password form is absent for
an account with no credential provider and present otherwise; the deletion's confirm
button stays disabled until the email is typed exactly; a last-admin refusal lists the
spaces it names; a re-authentication refusal offers to sign in again; the session marked
as current shows "This device" and has no sign-out button of its own.

## Out of Scope

- Changing the email address (needs email verification, which Plume does not have).
- Avatars: uploading, cropping or removing a profile picture.
- Setting a password on an account that signs in with Google, and linking or unlinking a
  Google account.
- Password reset by email ("forgot password").
- One-click unsubscribe from emails without signing in (`List-Unsubscribe`, signed tokens).
- Any other notification preference; emails for invitations are unchanged.
- Exporting attachment files, comments, or other users' memos; importing an archive.
- Default memo visibility, language, theme (stays in the sidebar menu, stored per device),
  access tokens, webhooks, tag colours.
- Any instance or operator settings: the operator keeps acting on Explore directly.
- A grace period or undo after account deletion; a data retention policy.

## Further Notes

- Suggested ticket order, smallest risk first: page and Account; password; sessions;
  notification preference; export; account deletion (Former user migration, procedure,
  confirmation screen). Tickets are not written yet.
- ADR 0003 already records the Former user and why deletion runs in Plume's own
  transaction; the deletion ticket should turn its "No account deletion" consequence into
  a description of what was built.
- The `freshAge` defect in better-auth 1.3.33 (seconds scaled to milliseconds twice) is
  worth re-checking on the next Better Auth upgrade; if fixed upstream, the session-age
  check could move back to the library.
