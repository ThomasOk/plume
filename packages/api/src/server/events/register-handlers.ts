import type { EventBus } from './event-bus';
import type { EmailSender } from '../email/email-sender';
import type { InvitationLinkConfig } from '../features/invitations/invitation-token';
import type { DatabaseInstance } from '@repo/db/client';
import { createSendInvitationEmailHandler } from '../features/invitations/send-invitation-email';
import { createPersistNotificationHandler } from '../features/notifications/persist-notification';
import { createSendCommentEmailHandler } from '../features/notifications/send-comment-email';
import { COMMENT_CREATED, INVITATION_CREATED } from './domain-events';
import { createInProcessEventBus } from './event-bus';

// Composition seam: builds the bus and subscribes every reaction to its event. Used both at
// server boot and in tests, so the wiring under test is the wiring that ships. Adding a new
// reaction to a comment is a new handler file plus one `.on(...)` here — the comment producer
// stays untouched. Both reactions subscribe to the same fact and run independently.
//
// `invitationLinks` is required rather than defaulted: a server that forgot it would email
// links pointing nowhere, and nothing would fail loudly. Its `webUrl` also builds the comment
// email's link to the Notifications settings.
export function createEventBusWithHandlers(
  db: DatabaseInstance,
  emailSender: EmailSender,
  invitationLinks: InvitationLinkConfig,
): EventBus {
  const bus = createInProcessEventBus();
  bus.on(COMMENT_CREATED, createPersistNotificationHandler(db));
  bus.on(COMMENT_CREATED, createSendCommentEmailHandler(db, emailSender, invitationLinks.webUrl));
  bus.on(INVITATION_CREATED, createSendInvitationEmailHandler(db, emailSender, invitationLinks));
  return bus;
}
