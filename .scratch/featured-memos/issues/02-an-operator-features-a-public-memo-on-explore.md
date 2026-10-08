# 02: An operator features a public memo on Explore

**What to build:** An operator features any public memo, whoever wrote it, from the memo's
actions menu; featured memos come first on Explore, latest featured on top, for every
reader signed in or not, with a "Featured" mark on Explore and on the memo's own page. An
operator unfeatures them the same way. A memo that stops being public stops being
featured, and becoming public again does not feature it back. Featured has no effect
outside Explore, as pins have none on Explore. See the spec,
`.scratch/featured-memos/spec.md`; the mechanics reuse the pin's (ADR 0006).

- The memo gains a nullable featured date; featuring keeps the first date when repeated,
  unfeaturing an unfeatured memo changes nothing, neither touches the memo's update date.
- A pure policy function decides who may feature, from the operator flag alone, shared
  with the web client like the role matrix.
- Two procedures, feature and unfeature, taking only the memo's identifier.
- Explore orders featured first (latest first, nulls last), then newest first, filtered or
  not. Scope lists ignore the featured date; Explore keeps ignoring pins. Every memo row
  shape carries the featured date.
- An edit to a non-public visibility and a move clear the featured date in the same
  statement.
- The card offers Feature / Unfeature to an operator on a public memo that is not a
  comment, wherever it is shown; the mark shows on Explore and the memo's own page only;
  a toast confirms; the memos queries are invalidated.

**Blocked by:** 01 — A user can be an operator.

**Status:** ready-for-agent

- [ ] An operator features their own public memo and another user's; a non-operator is refused as forbidden
- [ ] A private memo, a memo of a space and a comment are refused as bad requests; a memo the operator cannot read answers "not found"
- [ ] Explore lists featured memos first, latest featured on top, then the rest newest first; a tag, search or date filter narrows without reordering; Explore still ignores pins
- [ ] Personal and space lists are unaffected by featuring
- [ ] Featuring twice keeps the original featured date; unfeaturing twice changes nothing; the memo's update date is untouched
- [ ] An edit to private and a move into a space unfeature the memo; an edit that keeps it public does not; making it public again does not feature it back
- [ ] A featured memo stays featured after its operator's role is revoked
- [ ] The authenticated test caller can be made an operator; the rules above run on that seam (prior art: the pinned-memos integration test)
- [ ] The memo card offers Feature / Unfeature to an operator only, never on a non-public memo, calls the operation with only the identifier, and shows the mark where Explore's rules apply but not in a scope list (prior art: the card's pin tests)
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass
