import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrainDeps } from '../src/server/events/outbox';
import { startOutboxWorker } from '../src/server/events/worker';

// The worker's collaborators are irrelevant to the timer mechanics under test here: the
// injected `drain` never touches them, so a cast keeps the deps minimal and DB-free.
const fakeDeps = {} as Pick<DrainDeps, 'db' | 'bus'>;

// A promise plus its resolve/reject handles, so a test can start a "drain", leave it
// in-flight across timer advances, and release it on demand — the only way to observe the
// non-overlap guard and the graceful-stop behaviour deterministically.
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('startOutboxWorker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls drain once per interval', async () => {
    const drain = vi.fn().mockResolvedValue(undefined);
    const worker = startOutboxWorker({ ...fakeDeps, intervalMs: 1000, drain });

    expect(drain).not.toHaveBeenCalled(); // nothing runs before the first tick

    await vi.advanceTimersByTimeAsync(1000);
    expect(drain).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(drain).toHaveBeenCalledTimes(3);

    await worker.stop();
  });

  it('does not start a second drain while one is still in flight', async () => {
    const gate = deferred();
    const drain = vi.fn().mockReturnValue(gate.promise);
    const worker = startOutboxWorker({ ...fakeDeps, intervalMs: 1000, drain });

    // Three ticks pass while the first drain has not resolved: the guard must suppress the
    // extra two, or overlapping drains would re-process the same pending rows.
    await vi.advanceTimersByTimeAsync(3000);
    expect(drain).toHaveBeenCalledTimes(1);

    // Once the in-flight drain finishes, the next tick is free to run again.
    gate.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(drain).toHaveBeenCalledTimes(2);

    await worker.stop();
  });

  it('stop() clears the interval and waits for the in-flight drain to finish', async () => {
    const gate = deferred();
    const drain = vi.fn().mockReturnValue(gate.promise);
    const worker = startOutboxWorker({ ...fakeDeps, intervalMs: 1000, drain });

    await vi.advanceTimersByTimeAsync(1000); // start a drain, leave it in-flight
    expect(drain).toHaveBeenCalledTimes(1);

    let stopped = false;
    const stopping = worker.stop().then(() => {
      stopped = true;
    });

    // stop() must not resolve while the drain is still running.
    await Promise.resolve();
    expect(stopped).toBe(false);

    // No further ticks fire after stop(): the interval is cleared.
    await vi.advanceTimersByTimeAsync(5000);
    expect(drain).toHaveBeenCalledTimes(1);

    gate.resolve();
    await stopping;
    expect(stopped).toBe(true);
  });

  it('keeps polling after a drain throws, reporting the error via onError', async () => {
    const error = new Error('db unreachable');
    const drain = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);
    const onError = vi.fn();
    const worker = startOutboxWorker({ ...fakeDeps, intervalMs: 1000, drain, onError });

    await vi.advanceTimersByTimeAsync(1000);
    expect(onError).toHaveBeenCalledWith(error);

    // A failed tick must not kill the interval.
    await vi.advanceTimersByTimeAsync(1000);
    expect(drain).toHaveBeenCalledTimes(2);

    await worker.stop();
  });
});
