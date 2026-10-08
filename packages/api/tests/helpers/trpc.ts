import type { InvitationLinkConfig } from '../../src/server/features/invitations/invitation-token';
import type { AppLogger, StorageService } from '../../src/server/trpc';
import type { DatabaseInstance } from '@repo/db';
import { appRouter } from '../../src/server/index';
import { createFakeStorage } from './storage';

const mockLogger: AppLogger = {
  info: () => {},
  error: () => {},
  debug: () => {},
};

const mockStorage: StorageService = createFakeStorage();

// The secret invitation tokens are derived with. Tests derive the link token from it the way
// the email subscriber does.
export const TEST_INVITATION_SECRET = 'test-invitation-secret';

export const TEST_INVITATION_LINKS: InvitationLinkConfig = {
  webUrl: 'https://plume.example.com',
  secret: TEST_INVITATION_SECRET,
};

export const createTestCaller = (db: DatabaseInstance) => {
  return appRouter.createCaller({ db, storage: mockStorage, session: null, requestId: 'test', logger: mockLogger, invitationSecret: TEST_INVITATION_SECRET });
};

// `isOperator` forges the role the session would carry once granted (ADR 0007); that the
// session tells the truth about it is proven on the Better Auth seam. `storage` and `logger`
// let a test observe which objects a call removed from storage (see `createFakeStorage`) and
// what it logged.
export const createAuthenticatedCaller = (
  db: DatabaseInstance,
  userId = 'test-user-id',
  {
    isOperator = false,
    storage = mockStorage,
    logger = mockLogger,
  }: { isOperator?: boolean; storage?: StorageService; logger?: AppLogger } = {},
) => {
  const now = new Date();
  return appRouter.createCaller({
    db,
    storage,
    requestId: 'test',
    logger,
    invitationSecret: TEST_INVITATION_SECRET,
    session: {
      user: {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
        image: null,
        isOperator,
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
