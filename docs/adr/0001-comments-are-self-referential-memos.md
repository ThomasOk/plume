# Comments are self-referential memos

A comment is not a separate entity: it is a memo with a `parentId` pointing at another
memo (self-referential FK on the `memo` table). We chose this over a dedicated `comment`
table so comments reuse everything a memo already has — Markdown content, tags,
attachments, rendering, and query paths — for the cost of one nullable column.

The trade-off: identity rules that would be columns on a dedicated table become
application-enforced invariants instead. Comments are one level deep (creating a comment
whose parent already has a parent is rejected), and a comment has no visibility of its
own — it inherits its parent memo's visibility. A future reader seeing the self-reference
should know these constraints are deliberate, not missing features.
