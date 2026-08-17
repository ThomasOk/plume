import { EventEmitter } from 'node:events';
import type { DomainEventMap, DomainEventType } from './domain-events';

type Handler = (payload: unknown, meta: EventMeta) => Promise<void> | void;

// Delivery metadata for one dispatch — the event envelope, kept separate from the domain
// payload. `eventId` is the outbox row id: it identifies *this delivery*, not the fact, so
// it belongs here and not in the thin payload. Handlers that must be idempotent under the
// outbox's at-least-once replay use it as an idempotency key.
export interface EventMeta {
  eventId: string;
}

// The EventBus port isolates the dispatch mechanism. The only implementation today
// wraps Node's EventEmitter (in-process); this interface is the seam where a broker
// (Redis/RabbitMQ) would plug in if the app ever runs multiple instances.
//
// `on` is typed against the event map so handlers get their exact payload. `emit`
// takes a plain string + unknown because the drain step dispatches dynamically from
// stored outbox rows, where the event type is just text and the payload is jsonb.
export interface EventBus {
  on<K extends DomainEventType>(
    eventType: K,
    handler: (payload: DomainEventMap[K], meta: EventMeta) => Promise<void> | void,
  ): void;
  emit(eventType: string, payload: unknown, meta: EventMeta): Promise<void>;
}

export function createInProcessEventBus(): EventBus {
  const emitter = new EventEmitter();

  return {
    on(eventType, handler) {
      emitter.on(eventType, handler as Handler);
    },
    // A raw EventEmitter.emit is fire-and-forget: it ignores handler return values,
    // so the caller cannot know whether an async handler succeeded. We instead pull
    // the registered listeners and await them, so the drain step can mark a row
    // `processed` only when every handler resolved, and leave it `pending` if any
    // rejected (at-least-once delivery, retried until all handlers succeed).
    async emit(eventType, payload, meta) {
      const listeners = emitter.listeners(eventType) as Handler[];
      await Promise.all(listeners.map((listener) => listener(payload, meta)));
    },
  };
}
