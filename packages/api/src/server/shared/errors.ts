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
