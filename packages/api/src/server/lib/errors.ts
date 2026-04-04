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
