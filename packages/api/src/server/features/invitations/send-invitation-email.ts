import { eq } from '@repo/db';
import { space, spaceInvitation, user } from '@repo/db/schema';
import type { EmailSender } from '../../email/email-sender';
import type { InvitationCreatedPayload } from '../../events/domain-events';
import type { EventMeta } from '../../events/event-bus';
import type { DatabaseInstance } from '@repo/db/client';
import { type InvitationLinkConfig, invitationLink } from './invitation-token';

// Reaction to `invitation.created`: email the invited address its link. A new subscriber on
// the existing pipeline — the producer only recorded the event, and nothing about the comment
// reactions changed to make room for it (ADR 0002).
export function createSendInvitationEmailHandler(
  db: DatabaseInstance,
  emailSender: EmailSender,
  links: InvitationLinkConfig,
) {
  return async function sendInvitationEmail(
    { invitationId }: InvitationCreatedPayload,
    meta: EventMeta,
  ): Promise<void> {
    const [invitation] = await db
      .select({ email: spaceInvitation.email, spaceTitle: space.title, inviterName: user.name })
      .from(spaceInvitation)
      .innerJoin(space, eq(spaceInvitation.spaceId, space.id))
      .innerJoin(user, eq(spaceInvitation.invitedById, user.id))
      .where(eq(spaceInvitation.id, invitationId))
      .limit(1);

    // Revoked, replaced by a newer invitation, or already accepted before the drain: there is
    // no live link to send, and the newer invitation has its own event.
    if (!invitation) return;

    const link = invitationLink(links, invitationId);
    const inviter = escapeHtml(invitation.inviterName);
    const spaceTitle = escapeHtml(invitation.spaceTitle);

    // Idempotency key = the outbox row id, exactly as for the comment email: a replay of this
    // event is deduplicated by the provider.
    await emailSender.send({
      to: invitation.email,
      subject: `${invitation.inviterName} invited you to ${invitation.spaceTitle} on Plume`,
      html:
        `<p>${inviter} invited you to join <strong>${spaceTitle}</strong> on Plume.</p>` +
        `<p><a href="${escapeHtml(link)}">Join ${spaceTitle}</a></p>` +
        '<p>The link works once and expires in 7 days.</p>',
      idempotencyKey: meta.eventId,
    });
  };
}

// The space title and the inviter's name are user input; in the body they are text, not markup.
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
