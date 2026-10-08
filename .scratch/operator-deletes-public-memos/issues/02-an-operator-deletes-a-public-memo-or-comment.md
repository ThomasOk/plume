# 02: An operator deletes a public memo or comment

**What to build:** An **operator** can delete another user's public memo, or another
user's comment on a public memo, with the existing Delete action — on Explore, on the
memo's own page and in its comments. The operator's reach is exactly what Explore exposes:
a private memo or a memo of a space they are not a member of answers as if it did not
exist, and inside a space they are a member of they have their role there and nothing
more. See the spec, `.scratch/operator-deletes-public-memos/spec.md`, sections *Deleting as
an operator*, *Limits of the role*, *Policy*, *API contracts* and *Interface*, and ADR 0007
as amended.

- A new pure rule in the operator policy, beside the one for featuring, decides from the
  actor's operator flag and whether the memo is public (a comment shares its parent's
  visibility). Authorship and space role do not count. Exported to the web client like the
  feature rule.
- The space policy is untouched and never consults the operator flag. The delete operation,
  on the server and in the memo card, allows the action if the space policy's delete rule
  **or** the operator rule allows it.
- The memo delete procedure keeps its input and output; it reads the operator flag from the
  session, as `feature` does. A memo the operator cannot read still answers "not found"; a
  readable memo they may not delete answers "forbidden", as today.
- The memo card reuses the existing confirmation dialog, which already names another
  author's memo by its author's name. No new toast, no optimistic update.
- No notification to the author, no record of who deleted.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] An operator deletes another user's public memo; it is gone from Explore and from its author's list, with its comments
- [ ] An operator deletes another user's comment on a public memo
- [ ] An operator deletes a featured memo
- [ ] An operator is answered "not found" on another user's private memo and on a memo of a space they are not a member of
- [ ] An operator who is a member of a space has exactly their space role's delete powers there
- [ ] A memo made private again is out of an operator's reach
- [ ] A user who is not an operator is refused as forbidden on another user's public memo
- [ ] The operator policy's unit test covers the rule's table: operator or not, public or not
- [ ] The memo card offers Delete to an operator on another user's public memo and on another user's comment on a public memo, not on another user's memo that is not public, and never to a non-operator on another user's public memo
- [ ] Integration tests through the tRPC caller cover the server criteria (prior art: the featured-memos and space-memos integration tests); memo card tests cover the interface (prior art: the featuring tests)
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
