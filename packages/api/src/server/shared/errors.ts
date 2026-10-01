export class MemoNotFoundError extends Error {
  readonly code = 'MEMO_NOT_FOUND';
  constructor() {
    super('Memo not found');
  }
}

export class InsufficientPermissionsError extends Error {
  readonly code = 'INSUFFICIENT_PERMISSIONS';
  constructor() {
    super('You do not have permission to perform this action');
  }
}

export class AttachmentNotFoundError extends Error {
  readonly code = 'ATTACHMENT_NOT_FOUND';
  constructor() {
    super('Attachment not found');
  }
}

export class NotificationNotFoundError extends Error {
  readonly code = 'NOTIFICATION_NOT_FOUND';
  constructor() {
    super('Notification not found');
  }
}

export class FileSizeLimitExceededError extends Error {
  readonly code = 'FILE_SIZE_LIMIT_EXCEEDED';
  constructor(limitMb: number) {
    super(`File size exceeds the ${limitMb} MB limit`);
  }
}

// One error for "no such space" and "not a member of it": a distinct refusal would let a
// caller probe identifiers to learn which spaces exist.
export class SpaceNotFoundError extends Error {
  readonly code = 'SPACE_NOT_FOUND';
  constructor() {
    super('Space not found');
  }
}

// A link that was used, revoked, replaced by a newer invitation, or never issued. One answer
// for all of them: the holder can do nothing different in any of these cases.
export class InvitationNotFoundError extends Error {
  readonly code = 'INVITATION_NOT_FOUND';
  constructor() {
    super('This invitation is no longer valid');
  }
}

// Distinct from "not found" on purpose: the invitee should know to ask for a new link.
export class InvitationExpiredError extends Error {
  readonly code = 'INVITATION_EXPIRED';
  constructor() {
    super('This invitation has expired. Ask for a new one.');
  }
}

// Refused at both ends of an invitation: inviting an address that is already a member, and
// a member accepting a link.
export class AlreadyMemberError extends Error {
  readonly code = 'ALREADY_MEMBER';
  constructor(message = 'This address is already a member of the space') {
    super(message);
  }
}
