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

export interface DomainEventMap {
  [COMMENT_CREATED]: CommentCreatedPayload;
}

export type DomainEventType = keyof DomainEventMap;
