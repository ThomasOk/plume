import type { EventBus } from './event-bus';
import type { EmailSender } from '../email/email-sender';
import type { DatabaseInstance } from '@repo/db/client';
import { createPersistNotificationHandler } from '../features/notifications/persist-notification';
import { createSendCommentEmailHandler } from '../features/notifications/send-comment-email';
import { COMMENT_CREATED } from './domain-events';
import { createInProcessEventBus } from './event-bus';

// Composition seam: builds the bus and subscribes every reaction to its event. Used both at
// server boot and in tests, so the wiring under test is the wiring that ships. Adding a new
// reaction to a comment is a new handler file plus one `.on(...)` here — the comment producer
// stays untouched. Both reactions subscribe to the same fact and run independently.
export function createEventBusWithHandlers(
  db: DatabaseInstance,
  emailSender: EmailSender,
): EventBus {
  const bus = createInProcessEventBus();
  bus.on(COMMENT_CREATED, createPersistNotificationHandler(db));
  bus.on(COMMENT_CREATED, createSendCommentEmailHandler(db, emailSender));
  return bus;
}
