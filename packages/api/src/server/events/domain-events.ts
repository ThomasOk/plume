// Domain event vocabulary. Producers announce facts (past tense); handlers react.
// Adding an event type means extending DomainEventMap here and recording it via
// `recordEvent` in the same transaction as the fact it describes.

export const COMMENT_CREATED = 'comment.created';

// Thin payload: facts only. The receiver is deliberately NOT here — "who to notify"
// is a policy the handler derives, not a fact the producer knows.
export interface CommentCreatedPayload {
  commentId: string;
  parentMemoId: string;
  authorId: string;
}

export const INVITATION_CREATED = 'invitation.created';

// The id alone: the email, the space and the link are read or derived by the handler. The
// token in particular must never be here — the outbox keeps its rows, and a stored token is
// a live link (see `invitation-token.ts`).
export interface InvitationCreatedPayload {
  invitationId: string;
}

export interface DomainEventMap {
  [COMMENT_CREATED]: CommentCreatedPayload;
  [INVITATION_CREATED]: InvitationCreatedPayload;
}

export type DomainEventType = keyof DomainEventMap;
