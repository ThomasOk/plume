import type { EmailSender } from '../../email/email-sender';
import type { CommentCreatedPayload } from '../../events/domain-events';
import type { EventMeta } from '../../events/event-bus';
import type { DatabaseInstance } from '@repo/db/client';
import { resolveCommentRecipient } from './comment-recipient';

// Second, independent reaction to `comment.created`: email the parent memo's author that
// someone commented. It shares no code with `persistNotification` except the recipient
// policy (both must agree on who to react to) and touches nothing in the comment producer —
// it exists purely as a new subscriber, which is the whole point of the event-driven
// inversion. It depends only on the EmailSender port, never on Resend.
export function createSendCommentEmailHandler(db: DatabaseInstance, emailSender: EmailSender) {
  return async function sendCommentEmail(
    payload: CommentCreatedPayload,
    meta: EventMeta,
  ): Promise<void> {
    const recipient = await resolveCommentRecipient(db, payload);
    if (!recipient) return;

    // Idempotency key = the outbox row id. The outbox delivers at-least-once, so a replay
    // calls this again; passing a stable key lets the provider drop the duplicate send.
    await emailSender.send({
      to: recipient.email,
      subject: 'New comment on your memo',
      html: '<p>Someone commented on your memo.</p>',
      idempotencyKey: meta.eventId,
    });
  };
}
