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
cannot comment on a comment) and have no visibility of their own; they share the parent
memo's visibility.
_Avoid_: reply, thread, response.

**Hashtag**:
A tag as the user writes it inside a memo's Markdown content, with the leading `#`
(`#cooking/italian`). Hashtags are the source; tags are what gets extracted from them.

**Tag**:
The normalized value extracted from a hashtag — lowercase, no `#` (`cooking/italian`).
Memos are organized and filtered by their tags. Tags can be hierarchical using `/` as a
separator; filtering by a parent tag includes all its descendants.
_Avoid_: label, category, topic.

**Visibility**:
Whether a memo is `public` or `private`. A private memo is visible only to its author; a
public memo appears on Explore. Defaults to private.
_Avoid_: shared, published.

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
`UNREAD` until it is archived.
_Avoid_: alert, message.

**User**:
An authenticated account (managed by Better Auth). The general term for a person using Plume.

**Author**:
The user who created a given memo. Use "author" for a memo's creator, "user" for the
account in general.
_Avoid_: owner, creator, poster.

**Draft**:
A memo being composed, saved locally in the browser but not yet persisted to the server.
_Avoid_: autosave.

**Activity**:
A user's memo-writing activity aggregated per day, shown on a calendar.
_Avoid_: stats, heatmap.
