import { type DatabaseInstance, outbox, space, spaceInvitation, user } from '@repo/db';
import type { FakeEmailSender } from './helpers/email';
import { drainOnce } from '../src/server/events/outbox';
import { createEventBusWithHandlers } from '../src/server/events/register-handlers';
import { startTestDatabase, stopTestDatabase } from './helpers/db';
import { createFakeEmailSender } from './helpers/email';
import { TEST_INVITATION_LINKS, createAuthenticatedCaller } from './helpers/trpc';

let db: DatabaseInstance;

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

const admin = {
  id: 'admin',
  name: 'Ada',
  email: 'ada@example.com',
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const invitee = {
  id: 'invitee',
  name: 'Grace',
  email: 'grace@example.com',
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

let spaceId: string;

beforeEach(async () => {
  await db.delete(outbox);
  await db.delete(space);
  await db.delete(user);
  await db.insert(user).values([admin, invitee]);
  // A title that is also markup: it reaches the email body, so it must arrive as text.
  const created = await createAuthenticatedCaller(db, admin.id).spaces.create({
    title: 'Cooking <club>',
  });
  spaceId = created.id;
});

const invite = (email: string) =>
  createAuthenticatedCaller(db, admin.id).invitations.create({ spaceId, email, role: 'member' });

const drainWith = (emailSender: FakeEmailSender) =>
  drainOnce({ db, bus: createEventBusWithHandlers(db, emailSender, TEST_INVITATION_LINKS) });

const linkIn = (html: string) => {
  const match = /href="([^"]+)"/.exec(html);
  if (!match) throw new Error('no link in the email');
  return new URL(match[1]!);
};

describe('sendInvitationEmail handler (via drainOnce)', () => {
  it('sends exactly one email, to the invited address, after the outbox drains', async () => {
    await invite('someone-without-an-account@example.com');
    const emailSender = createFakeEmailSender();

    // Nothing is sent by the producer itself: the email is a consequence of the drain.
    expect(emailSender.sent).toHaveLength(0);
    await drainWith(emailSender);

    expect(emailSender.sent).toHaveLength(1);
    const [email] = emailSender.sent;
    expect(email!.to).toBe('someone-without-an-account@example.com');
    expect(email!.subject).toContain('Cooking <club>');
    expect(email!.html).toContain('Cooking &lt;club&gt;');
    expect(email!.html).not.toContain('<club>');

    // The idempotency key is the outbox row id, as for the comment email.
    const [row] = await db.select().from(outbox);
    expect(email!.idempotencyKey).toBe(row!.id);
  });

  it('carries a link whose token lets its holder join the space', async () => {
    await invite(invitee.email);
    const emailSender = createFakeEmailSender();
    await drainWith(emailSender);

    const link = linkIn(emailSender.sent[0]!.html);
    expect(link.origin).toBe(new URL(TEST_INVITATION_LINKS.webUrl).origin);
    const token = decodeURIComponent(link.pathname.replace(/^\/invitations\//, ''));

    const accepted = await createAuthenticatedCaller(db, invitee.id).invitations.accept({ token });
    expect(accepted).toEqual({ spaceId });
  });

  it('sends no second email when the same event is drained again', async () => {
    await invite(invitee.email);
    const emailSender = createFakeEmailSender();
    await drainWith(emailSender);

    // A replay: the row goes back to pending and is dispatched again with the same key.
    await db.update(outbox).set({ status: 'pending' });
    await drainWith(emailSender);

    expect(emailSender.sent).toHaveLength(1);
  });

  it('leaves the row pending for retry when the send fails, and the invitation stays', async () => {
    await invite(invitee.email);
    const failing: FakeEmailSender = {
      sent: [],
      async send() {
        throw new Error('email provider unavailable');
      },
    };

    await drainWith(failing);

    const [row] = await db.select().from(outbox);
    expect(row).toEqual(
      expect.objectContaining({ status: 'pending', attempts: 1 }),
    );
    expect(row!.lastError).toContain('email provider unavailable');
    expect(await db.select().from(spaceInvitation)).toHaveLength(1);

    // The provider recovers: the retry delivers the one email.
    await db.update(outbox).set({ nextAttemptAt: new Date() });
    const emailSender = createFakeEmailSender();
    await drainWith(emailSender);
    expect(emailSender.sent).toHaveLength(1);
  });

  it('sends nothing for an invitation revoked before the drain', async () => {
    const invitation = await invite(invitee.email);
    await createAuthenticatedCaller(db, admin.id).invitations.revoke({
      spaceId,
      invitationId: invitation.id,
    });
    const emailSender = createFakeEmailSender();

    await drainWith(emailSender);

    expect(emailSender.sent).toHaveLength(0);
    const [row] = await db.select().from(outbox);
    expect(row!.status).toBe('processed');
  });

  it('emails only the live link when an address is re-invited before the drain', async () => {
    await invite(invitee.email);
    await invite(invitee.email);
    const emailSender = createFakeEmailSender();

    await drainWith(emailSender);

    expect(emailSender.sent).toHaveLength(1);
    const token = linkIn(emailSender.sent[0]!.html).pathname.split('/').pop()!;
    const accepted = await createAuthenticatedCaller(db, invitee.id).invitations.accept({ token });
    expect(accepted).toEqual({ spaceId });
  });
});
