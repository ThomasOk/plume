import { createAuthClient as createBetterAuthClient } from 'better-auth/react';

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

    /**
     * Only uncomment the line below if you are using plugins, so that
     * your types can be correctly inferred.
     * Ensure that you are using the client-side version of the plugin,
     * e.g. `adminClient` instead of `admin`.
     */
    // plugins: []
  });

export type AuthClient = ReturnType<typeof createAuthClient>;
