import { createHash, createHmac } from 'node:crypto';

// The token in an invitation link is derived, not stored: HMAC(secret, invitation id). The
// id is random, so the token is as unguessable as random bytes to anyone without the secret,
// and it can be recomputed wherever the secret is — which is what lets the email subscriber
// build the link from the invitation id alone. The alternative, a random token carried in the
// `invitation.created` payload, would sit in plaintext in the outbox forever: a leak of that
// table would yield live links.
//
// The database keeps only `hashInvitationToken(token)`, to find the invitation a link names.
// A plain hash is enough there: the token carries 256 bits, so there is nothing to brute-force.
//
// Reusing the auth secret, the prefix keeps these HMACs from colliding with anything else
// signed under it. Rotating that secret leaves sent links working (they are looked up by hash)
// but breaks the link of an email still waiting in the outbox.
export function deriveInvitationToken(secret: string, invitationId: string): string {
  return createHmac('sha256', secret).update(`invitation:${invitationId}`).digest('base64url');
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// What it takes to turn an invitation id into the link the invitee follows.
export interface InvitationLinkConfig {
  webUrl: string;
  secret: string;
}

export function invitationLink({ webUrl, secret }: InvitationLinkConfig, invitationId: string) {
  return new URL(`/invitations/${deriveInvitationToken(secret, invitationId)}`, webUrl).toString();
}
