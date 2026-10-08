import type { StorageService } from '../../src/server/trpc';

// Test double for the StorageService port, mirroring the fake email sender. It records the
// keys it was asked to delete, so a test observes which files left storage, and it can be
// told to fail every deletion, the way an R2 outage would.
//
// A factory (not a module-level const) because each test needs its own fresh recording.
export interface FakeStorage extends StorageService {
  readonly deletedKeys: string[];
}

export const createFakeStorage = ({ failDeletes = false }: { failDeletes?: boolean } = {}): FakeStorage => {
  const deletedKeys: string[] = [];

  return {
    deletedKeys,
    generateUploadUrl: async (key, _mimeType, filename) => ({
      url: `https://mock-r2.example.com/${key}`,
      contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    }),
    getPublicUrl: (key) => `https://mock-r2.example.com/${key}`,
    async deleteObject(key) {
      if (failDeletes) throw new Error('storage unavailable');
      deletedKeys.push(key);
    },
  };
};
