# Plume

Domain glossary for Plume — a note-taking app where users write, organize, and share
short Markdown notes. This file is the canonical vocabulary: one word per concept, no
implementation detail. When naming a domain concept (issue titles, tests, specs,
refactors), use the term defined here.

## Language

**Memo**:
A short note authored by a user, written in Markdown. The core entity of the app.
_Avoid_: post, note (the codebase says "memo" everywhere; `post` is dead template scaffolding).

**Comment**:
A reply to a memo — itself a memo with a parent. Comments are one level deep (you
cannot comment on a comment) and have neither a visibility nor a space of their own; they
share the parent memo's.
_Avoid_: reply, thread, response.

**Reaction**:
An emoji a user leaves on a memo or a comment, chosen from a fixed set. A user has at most
one reaction per memo: choosing another replaces it. Any signed-in reader may react, the
author included, and every reader of the memo sees who reacted. Reacting sends no
notification. A reaction is a gesture, not content: it does not outlive its user, and a
move clears the memo's reactions, since the audience that left them is no longer the one
reading it.
_Avoid_: like, emoji, vote.

**Hashtag**:
A tag as the user writes it inside a memo's Markdown content, with the leading `#`
(`#cooking/italian`). Hashtags are the source; tags are what gets extracted from them.

**Tag**:
The normalized value extracted from a hashtag — lowercase, no `#` (`cooking/italian`).
Memos are organized and filtered by their tags. Tags can be hierarchical using `/` as a
separator; filtering by a parent tag includes all its descendants.
_Avoid_: label, category, topic.

**Visibility**:
Who can read a memo: `private` (its author alone), `space` (the members of its space), or
`public` (everyone, on Explore). Defaults to private. A memo has a space if and only if
its visibility is `space`.
_Avoid_: shared, published.

**Audience**:
Who reads a memo, as one value: private, public, or one of the author's spaces. It sets the
memo's visibility and its space together, because the two are a single decision. A memo
gets its audience from the scope it is written in. Entering or leaving a space is a move;
a personal memo switching between private and public is an edit.
_Avoid_: destination, target, share with.

**Scope**:
The context a user is in: their personal memos, or one space. It decides what the memo
list and every derived view show, and where a memo written there lands. Writing in a space
puts the memo in that space; writing in the personal scope offers only private or public.
_Avoid_: context, view, workspace.

**Personal**:
Said of a memo that belongs to no space. A personal memo is private or public; it is
never visible to a space.
_Avoid_: own, personal space.

**Pin**:
A mark that puts a memo first in its scope, seen by every reader of the memo. In a space,
admins pin; in the personal scope, the author does. Pinning is curation, not an edit: an
admin may pin another member's memo. A pin belongs to the scope it was set in, so a move
unpins the memo, and Explore — which is no one's scope — ignores pins. Comments cannot be
pinned.
_Avoid_: favorite, bookmark, star, sticky.

**Featured**:
Said of a public memo an operator highlights first on Explore, for every reader of
Explore, signed in or not. Any author's public memo may be featured; a comment may not.
A memo that stops being public stops being featured, and becoming public again does not
feature it back.
Distinct from a pin: a pin belongs to a scope, and Explore is no one's scope.
_Avoid_: promoted, highlighted, announcement, pinned (on Explore).

**Explore**:
The public page listing every user's public memos. Readable without signing in.
_Avoid_: feed, timeline, public page.

**Attachment**:
A file uploaded and attached to a memo, stored in Cloudflare R2. An attachment is
`pending` until its memo is saved, then becomes `active`; orphaned `pending` attachments
can be cleaned up.
_Avoid_: file, upload, media.

**Notification**:
A signal to a user (the receiver) that another user (the sender) acted on their content.
The only type today is a comment on one of the receiver's memos. A notification is
`UNREAD` until it is archived. The comment email is a separate signal from the
notification: a preference can turn the email off, never the notification.
_Avoid_: alert, message.

**Preference**:
A choice a user makes about how Plume behaves toward them. Every preference has a
default, so a user who never touches it keeps the default. A preference follows the
account or stays on the device: whether they are emailed when someone comments on their
memos follows the account; whether Plume plays sounds stays on the device, since the
same person may want them at home and not in a meeting. Distinct from the account (name,
password, sessions), which describes who the user is rather than how Plume treats them.
_Avoid_: setting (Settings is the page that shows them), option, config.

**User**:
An authenticated account (managed by Better Auth). The general term for a person using Plume.

**Author**:
The user who created a given memo. Use "author" for a memo's creator, "user" for the
account in general.
_Avoid_: owner, creator, poster.

**Former user**:
The author that a deleted account's memos and comments pass to when they outlive it: memos
in a space, and comments under someone else's memo. It is no one, signs in nowhere, and is
never a member. Shown as "Deleted user".
_Avoid_: ghost, anonymous, deleted account.

**Space**:
A container of memos shared by several users. A memo belongs to at most one space, and a
space owns its memos: they stay when their author leaves it.
_Avoid_: workspace, team, group, organization.

**Operator**:
A user who runs the Plume instance and acts on what belongs to no scope, such as featuring
memos on Explore or deleting another user's public memo, or a comment on one. Being an
operator grants nothing inside a space they are not a member of, and nothing over a memo
that is not public.
_Avoid_: admin (a role in a space), superuser, developer, owner, moderator.

**Member**:
A user who belongs to a space. `member` is also the name of the ordinary role, the one
that is not `admin` — an admin is a member too.
_Avoid_: participant, collaborator.

**Role**:
What a member may do in a space: `admin` governs the space and its membership, `member`
writes and governs only their own memos. Neither may edit another member's memo.
_Avoid_: permission, right.

**Invitation**:
An offer to join a space, addressed to an email and accepted by following a link. It
carries the role the invitee will receive, it expires, and it ceases to exist once
accepted.
_Avoid_: request, invite.

**Draft**:
A memo being composed, saved locally in the browser but not yet persisted to the server.
Each scope keeps its own draft, so a draft never follows the user into another scope.
_Avoid_: autosave.

**Activity**:
Memo-writing activity aggregated per day, shown on a calendar. Its subject is whatever is
in scope: your personal memos, or a space's memos from every member.
_Avoid_: stats, heatmap.
