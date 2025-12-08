import { betterAuth } from 'better-auth';

import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { DatabaseInstance } from '@repo/db/client';

export interface AuthOptions {
  baseURL: string;
  trustedOrigins: string[];
  authSecret: string;
  db: DatabaseInstance;
  google?: {
    clientId: string;
    clientSecret: string;
  };
}

export type AuthInstance = ReturnType<typeof createAuth>;

/**
 * This function is abstracted for schema generations in cli-config.ts
 */
export const getBaseOptions = (db: DatabaseInstance) => ({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),

  /**
   * Only uncomment the line below if you are using plugins, so that
   * your types can be correctly inferred:
   */
  // plugins: [],
});

export const createAuth = ({
  baseURL,
  trustedOrigins,
  db,
  authSecret,
  google: googleConfig,
}: AuthOptions) => {
  return betterAuth({
    ...getBaseOptions(db),
    secret: authSecret,
    trustedOrigins: trustedOrigins.map((url) => new URL(url).origin),
    baseURL: baseURL,
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
    },
    socialProviders: googleConfig
      ? {
          google: {
            clientId: googleConfig.clientId,
            clientSecret: googleConfig.clientSecret,
          },
        }
      : {},
  });
};
