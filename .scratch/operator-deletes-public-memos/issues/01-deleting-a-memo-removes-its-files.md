# 01: Deleting a memo removes its files

**What to build:** Deleting a memo — by its author, by a space admin, and later by an
operator — removes from storage the files of the memo's attachments and of its comments'
attachments, so a deleted memo leaves nothing reachable by its link. Today the attachment
records go with the memo but the files stay online. A storage failure never keeps a memo
alive. See the spec, `.scratch/operator-deletes-public-memos/spec.md`, sections *Files of a
deleted memo* and *Files in storage*.

- Applies to every deletion through the memo delete operation, whoever calls it. Deleting a
  space or an account is out of scope.
- The storage keys of the memo's and its comments' attachments are read before the rows are
  deleted (the cascade removes the attachment records), and the files are removed once the
  deletion has committed.
- Removing a file is best-effort: a failure is logged and neither fails nor undoes the
  deletion.
- The fake storage of the integration test helpers gains a way to record the keys it was
  asked to delete, and to fail on demand.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] An author deleting their memo removes the files of its attachments from storage
- [ ] Deleting a memo removes the files attached to its comments
- [ ] A space admin deleting a member's memo removes its files
- [ ] Deleting a memo without attachments removes nothing from storage and behaves as today
- [ ] A storage failure while removing a file does not fail the deletion, and the memo is gone
- [ ] Integration tests cover each criterion above through the tRPC caller (prior art: the attachments and space-memos integration tests)
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
