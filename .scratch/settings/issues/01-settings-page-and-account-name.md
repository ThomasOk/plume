# 01: The settings page, and a user edits their name

**What to build:** `/settings` becomes a real page. A signed-in user lands on the Account section and moves between Account, Security, Notifications and Data from a side navigation (a horizontal tab row on narrow screens); each section has its own address, and `/settings` opens Account. A visitor who is not signed in is sent to sign-in from any settings address. In Account, the user sees their name and email, changes their name, and sees it everywhere at once without signing out. A name that is empty, whitespace only or longer than 100 characters is refused; surrounding spaces are trimmed. The other three sections show an empty state until their tickets land.

See spec: `.scratch/settings/spec.md` — "Page and routing", "Account — name", user stories 1–13.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A settings layout route with one child route per section (`account`, `security`, `notifications`, `data`); `/settings` redirects to `/settings/account`; the layout owns the sign-in guard and the navigation, which marks the current section
- [ ] The navigation fits a phone-width screen
- [ ] A new `account` web feature exposes the profile section; routes only compose it
- [ ] The name is changed through Better Auth's `updateUser` from the client, so the cached session shows the new name immediately
- [ ] The auth configuration gains a user-update database hook that trims the name and refuses it when empty or over 100 characters; the client validates the same rule with a shared schema
- [ ] The email is shown read-only
- [ ] Better Auth seam test: empty, whitespace-only and 101-character names are refused; a name with surrounding spaces is stored trimmed
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
