import type { DatabaseInstance } from '@repo/db';
import type { StorageService } from '../../src/server/trpc';
import { appRouter } from '../../src/server/index';

const mockStorage: StorageService = {
  generateUploadUrl: async (key, _mimeType, filename) => ({
    url: `https://mock-r2.example.com/${key}`,
    contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
  }),
  getPublicUrl: (key) => `https://mock-r2.example.com/${key}`,
  deleteObject: async () => {},
};

export const createTestCaller = (db: DatabaseInstance) => {
  return appRouter.createCaller({ db, storage: mockStorage, session: null });
};

export const createAuthenticatedCaller = (
  db: DatabaseInstance,
  userId = 'test-user-id',
) => {
  const now = new Date();
  return appRouter.createCaller({
    db,
    storage: mockStorage,
    session: {
      user: {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
        image: null,
      },
      session: {
        id: 'test-session-id',
        userId,
        expiresAt: new Date(Date.now() + 86400000),
        token: 'test-token',
        createdAt: now,
        updatedAt: now,
        ipAddress: null,
        userAgent: null,
      },
    },
  });
};
