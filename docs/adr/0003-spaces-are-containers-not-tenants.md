# Spaces are containers, not tenants

A space is a container of memos shared by several users, added *beside* personal memos
rather than underneath them. `memo.space_id` is nullable: a memo with no space is
personal, and the user — not the space — remains the root of the model. We chose this
over the tenant-first shape (every memo lives in a space, with a personal space created
at signup) because the product is user-first: someone writes private notes, publishes a
few, and joins a space for the ones they share. A personal space that cannot be invited
into would be a space in name only, carrying a special case in every membership path, and
we would have paid a data migration to buy a uniformity we did not get.

Visibility and placement are **one decision, not two**: a memo is `private`, `public`, or
`space`, and

```
visibility = 'space'  ⟺  space_id IS NOT NULL
```

is enforced by a `CHECK` constraint. The equivalence — not the weaker implication — is
what makes illegal states unrepresentable. A team cannot publish collectively, and a
memo cannot sit in a space while hidden from it. The redundancy between the two columns is
deliberate and locked by the database, which we prefer to a `visibility` column whose
meaning would depend on another column being null.

## Considered options

- **Tenant-first (`space_id NOT NULL`, personal space per user)** — rejected: it fits
  products where the workspace is the root (Slack, Linear). Here it would invent an entity
  the user never asked for, and require a backfill migration on every existing memo.
- **Space as an audience (M-N: one memo shared with several spaces)** — rejected: it needs
  a join table and makes every list query more expensive, to answer a need nobody has. The
  container gives a single column to scope by, which is what the authorization layer needs.
- **Visibility and space as independent axes** (usememos' shape) — rejected: allowing
  `space + private` and `space + public` forces a reconciliation step between the two
  fields on every write. In usememos this is ~30 lines in `store/memo.go` plus a filter
  function in the editor UI to hide the combinations that are illegal. The equivalence
  deletes both.

## Consequences (the deliberate no's and their triggers)

- **Explore needs no change at all.** It filters on `visibility = 'public'`, and a space
  memo cannot be public, so no team content can reach it — a class of leak made
  impossible by the model instead of guarded by code.
- **No collective publishing.** To put a memo on Explore, its author takes it out of the
  space and it becomes personal again. Trigger to revisit: someone asks for a public team
  page, with the space as the signatory rather than a person.
- **A space owns its memos.** Leaving a space, or being removed from it, leaves the memos
  behind; `memo.user_id` still names their author, who simply stops being a reader.
  Deleting a space deletes its memos, admins only.
- **No account deletion.** Plume has none today — no code path triggers the
  `ON DELETE CASCADE` on `memo.user_id`. When one is built, deleting an account must not
  take a space's memos with it: the chosen mechanism is a **ghost user** (a reserved
  `user` row), to which space memos are reassigned in the same transaction that deletes
  the account. Personal memos then cascade on their own, `memo.user_id` stays `NOT NULL`,
  and no query changes. Making the column nullable is the trap: personal memos would be
  left with no author, hence no reader and no owner. Trigger: the account-deletion feature.
- **No in-app notification for invitations**, email only. `notification.entity_id` is a
  foreign key to `memo.id`; an invitation would force that column to become polymorphic,
  which is its own modelling decision and not a side effect of this one.
