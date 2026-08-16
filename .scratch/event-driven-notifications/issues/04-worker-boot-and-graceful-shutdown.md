# 04 — Outbox worker starts at server boot and shuts down cleanly

**What to build:** In production, the outbox is drained automatically by an in-process
polling worker, without any manual trigger, and the worker stops cleanly on redeploy. This
is the runtime wiring that makes the pipeline live on the deployed single instance
(Railway), kept separate from the drain logic so it never runs in tests.

- `startOutboxWorker(deps)` runs a ~1s `setInterval` that calls `drainOnce`. It is invoked
  **only** at server boot — never as a side effect of importing a module — so the interval
  never starts during tests.
- On `SIGTERM` (Railway sends it on redeploy): stop the interval (`clearInterval`) and let
  the in-flight `drainOnce` finish.

**Blocked by:** 01 — needs `drainOnce`. Independent of 02 and 03.

**Status:** ready-for-agent

- [ ] With the server booted, a newly created Comment's Notification (and email, if ticket
      02 is present) appears within about one poll interval with no manual `drainOnce` call.
- [ ] Importing the worker module does not start the interval; only `startOutboxWorker`
      does — verified by the test suite not draining on its own.
- [ ] On `SIGTERM`, the interval stops and an in-flight drain is allowed to complete.
