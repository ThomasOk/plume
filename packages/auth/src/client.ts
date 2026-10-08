import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient as createBetterAuthClient } from 'better-auth/react';
import type { AuthInstance } from './server';

export interface AuthClientOptions {
  apiBaseUrl: string;
}

export const createAuthClient = ({ apiBaseUrl }: AuthClientOptions) =>
  createBetterAuthClient({
    baseURL: apiBaseUrl,
    // allow session cookies to be sent with each request
    fetchOptions: {
      credentials: 'include',
    },

    // Types the session's user with the server's additional fields (`isOperator`), read from
    // the server's own configuration so the two cannot drift. Type-only: nothing of the
    // server reaches the bundle.
    plugins: [inferAdditionalFields<AuthInstance>()],
  });

export type AuthClient = ReturnType<typeof createAuthClient>;
