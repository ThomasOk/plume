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

// The user named is not a member of the space — or never existed. One answer for both.
export class MemberNotFoundError extends Error {
  readonly code = 'MEMBER_NOT_FOUND';
  constructor() {
    super('Member not found');
  }
}

// Refused on every path that would leave a space with nobody able to govern it: leaving,
// being removed, being demoted.
export class LastAdminError extends Error {
  readonly code = 'LAST_ADMIN';
  constructor() {
    super('A space needs an admin. Make someone else an admin first.');
  }
}

// Deleting the account of the last admin of spaces that have other members would leave each
// with nobody able to govern it. The spaces travel with the refusal so the interface can name
// them: the user has to make someone else admin in each one first.
export class LastAdminOfSpacesError extends Error {
  readonly code = 'LAST_ADMIN_OF_SPACES';
  constructor(readonly spaces: { id: string; name: string }[]) {
    super('You are the only admin of spaces with other members. Make someone else an admin of each first.');
  }
}

// The email typed to confirm an account deletion is not the account's.
export class ConfirmationEmailMismatchError extends Error {
  readonly code = 'CONFIRMATION_EMAIL_MISMATCH';
  constructor() {
    super('The email does not match your account');
  }
}

// A wrong password, or none given for an account that has one: the same answer for both.
export class IncorrectPasswordError extends Error {
  readonly code = 'INCORRECT_PASSWORD';
  constructor() {
    super('Incorrect password');
  }
}

// An account without a password proves who is deleting it by a recent sign-in. Distinct from
// a wrong password: the way out is signing in again, not retyping something.
export class ReauthenticationRequiredError extends Error {
  readonly code = 'REAUTHENTICATION_REQUIRED';
  constructor() {
    super('Sign in again to delete your account');
  }
}
