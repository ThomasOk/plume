# 03: A user sees and signs out their sessions

**What to build:** In the Security section, every user sees the devices they are signed in on — browser and operating system, IP address, last activity — with the current one marked "This device". They sign out any other session, or all sessions but this one in one action, and a signed-out session disappears from the list. A session whose browser cannot be identified still appears, with a generic label.

See spec: `.scratch/settings/spec.md` — "Security", user stories 21–27.

**Blocked by:** 01 (The settings page, and a user edits their name)

**Status:** ready-for-agent

- [ ] Uses Better Auth's `listSessions`, `revokeSession` and `revokeOtherSessions`; no server code is added
- [ ] The user agent is parsed client-side with `bowser` into browser and OS; the IP is shown as stored, no geolocation
- [ ] The current session has no sign-out button of its own
- [ ] The list refreshes after a revocation
- [ ] Component test: the current session shows "This device" and has no sign-out button; an unparseable user agent still renders a row
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
