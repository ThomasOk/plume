import type { DatabaseInstance } from '@repo/db';
import { appRouter } from '../../src/server/index';

export const createTestCaller = (db: DatabaseInstance) => {
  return appRouter.createCaller({ db, session: null });
};

export const createAuthenticatedCaller = (
  db: DatabaseInstance,
  userId = 'test-user-id',
) => {
  const now = new Date();
  return appRouter.createCaller({
    db,
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
