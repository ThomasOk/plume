export interface StorageService {
  generateUploadUrl(
    key: string,
    mimeType: string,
    filename: string,
  ): Promise<{ url: string; contentDisposition: string }>;
  getPublicUrl(key: string): string;
  deleteObject(key: string): Promise<void>;
}

interface StorageLogger {
  error(obj: object, msg?: string): void;
}

/**
 * Removes the objects of attachments whose records a committed deletion already removed.
 * Best-effort: the database is the source of truth, and an object left in storage is a
 * smaller harm than a deletion that fails while storage is down. Every key is attempted,
 * whichever fails, and each failure is logged with `context` to find it again.
 */
export async function removeDeletedObjects(
  storage: StorageService,
  logger: StorageLogger,
  storageKeys: string[],
  context: { message: string } & Record<string, unknown>,
) {
  const { message, ...fields } = context;
  const removals = await Promise.allSettled(storageKeys.map((key) => storage.deleteObject(key)));
  removals.forEach((removal, i) => {
    if (removal.status === 'rejected') {
      logger.error({ err: removal.reason, ...fields, storageKey: storageKeys[i] }, message);
    }
  });
}
