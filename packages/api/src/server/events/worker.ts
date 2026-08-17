import { drainOnce, type DrainDeps } from './outbox';

// Default poll cadence. Notifications are eventually consistent (the receiver is never the
// commenter, and the notification list already polls every 30s), so ~1s latency is invisible
// while keeping the load on Postgres negligible on a single instance.
const DEFAULT_POLL_INTERVAL_MS = 1000;

export interface OutboxWorkerDeps extends DrainDeps {
  // Poll cadence override, mainly for tests that want a fast interval.
  intervalMs?: number;
  // Called when a drain rejects at the infrastructure level (see below). Boot passes a
  // logger; omit it and such failures are silently retried on the next tick.
  onError?: (error: unknown) => void;
  // Seam: defaults to the real `drainOnce`. Injecting a fake lets the timer orchestration
  // (interval cadence, non-overlap guard, graceful stop) be tested without a database, and
  // lets a test hold a drain in-flight to observe the guard and the stop-awaits-drain path.
  drain?: (deps: DrainDeps) => Promise<void>;
}

export interface OutboxWorker {
  // Stops the interval and resolves once any in-flight drain has finished.
  stop: () => Promise<void>;
}

// Starts the in-process polling worker that drains the outbox on an interval. Called ONLY at
// server boot — never as a side effect of importing a module — so the interval never runs in
// tests (tests drive `drainOnce` directly). Single-worker by design: the non-overlap guard
// stands in for the row-level locking (`FOR UPDATE SKIP LOCKED`) that a multi-worker future
// would need but which is out of scope here.
export function startOutboxWorker(deps: OutboxWorkerDeps): OutboxWorker {
  const { db, bus, intervalMs = DEFAULT_POLL_INTERVAL_MS, onError, drain = drainOnce } = deps;

  // Non-null while a drain is running. Doubles as the overlap guard and as the handle
  // `stop()` awaits so a redeploy never interrupts a delivery mid-flight.
  let inFlight: Promise<void> | null = null;

  const tick = () => {
    // A drain occasionally outruns the interval. Skip rather than start a second one: with no
    // row locking, two concurrent drains would select and dispatch the same pending rows.
    if (inFlight) return;

    // `.then(() => drain(...))` rather than calling drain() directly: it defers the call into
    // a microtask so even a synchronous throw becomes a rejection the `.catch` below handles,
    // instead of escaping the setInterval callback uncaught.
    inFlight = Promise.resolve()
      .then(() => drain({ db, bus }))
      .catch((error) => {
        // `drainOnce` already absorbs per-row handler failures (backoff/dead-letter), so a
        // rejection here is infrastructure-level — e.g. the DB is briefly unreachable. Report
        // it and keep polling; one bad tick must not tear down the interval.
        onError?.(error);
      })
      .finally(() => {
        inFlight = null;
      });
  };

  const interval = setInterval(tick, intervalMs);

  return {
    async stop() {
      clearInterval(interval);
      await inFlight;
    },
  };
}
