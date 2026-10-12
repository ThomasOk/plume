import { test as base, type APIRequestContext, type Response } from '@playwright/test';

export { expect } from '@playwright/test';

const SERVER = 'http://localhost:3035';
const WEB = 'http://localhost:8085';

// The writes whose result a test leaves behind, and the procedure that takes each back.
const UNDO: Record<string, (id: string) => [procedure: string, input: unknown]> = {
  'memos.create': (id) => ['memos.delete', { id }],
  'memos.space.create': (id) => ['memos.delete', { id }],
  'spaces.create': (spaceId) => ['spaces.delete', { spaceId }],
};

// What a batched tRPC write answered, procedure by procedure: `/trpc/a,b?batch=1` answers
// `[resultOfA, resultOfB]`.
const createdBy = async (response: Response) => {
  const url = new URL(response.url());
  if (!url.pathname.startsWith('/trpc/') || response.request().method() !== 'POST' || !response.ok()) return [];
  const procedures = url.pathname.slice('/trpc/'.length).split(',');
  if (!procedures.some((procedure) => procedure in UNDO)) return [];
  const results = (await response.json().catch(() => [])) as { result?: { data?: { json?: { id?: string } } } }[];
  return procedures.flatMap((procedure, i) => {
    const id = results[i]?.result?.data?.json?.id;
    const undo = UNDO[procedure];
    return undo && id ? [undo(id)] : [];
  });
};

const call = (request: APIRequestContext, procedure: string, input: unknown) =>
  request.post(`${SERVER}/trpc/${procedure}`, { data: { json: input } });

/** An account a test signs up, to delete once it is over. */
export interface Account {
  email: string;
  password: string;
}

/**
 * The e2e tests share one database and one user, and nothing resets either between runs:
 * whatever a test writes stays, and piles up until it gets in the way of the next ones (a
 * menu of spaces taller than the screen). Every test cleans up after itself instead, pass
 * or fail.
 *
 * - The memos and spaces the page creates are recorded as the server confirms them, then
 *   deleted, the memos first, as the user who created them.
 * - The accounts a test signs up are deleted by signing in as each, once the test names it
 *   through `accounts`.
 */
export const test = base.extend<{ cleanUp: void; accounts: Account[] }>({
  // Playwright reads a fixture's dependencies from its first parameter, which must be a
  // destructuring pattern, even an empty one.
  // eslint-disable-next-line no-empty-pattern
  accounts: async ({}, provide) => {
    await provide([]);
  },
  cleanUp: [
    async ({ page, playwright, accounts }, provide) => {
      const undo: Promise<[string, unknown][]>[] = [];
      page.on('response', (response) => undo.push(createdBy(response)));

      await provide();

      const writes = (await Promise.all(undo)).flat();
      const memosFirst = [...writes].sort(([a], [b]) => Number(b === 'memos.delete') - Number(a === 'memos.delete'));
      // A memo already gone with its space, or deleted by the test itself, answers not
      // found: nothing left to do.
      for (const [procedure, input] of memosFirst) await call(page.request, procedure, input);

      for (const account of accounts) {
        // Signed out to start with: a new request context otherwise inherits the project's
        // session, the test user's, and would act as them. The auth server refuses a
        // sign-in without the origin of the app.
        const request = await playwright.request.newContext({
          storageState: { cookies: [], origins: [] },
          extraHTTPHeaders: { Origin: WEB },
        });
        const signIn = await request.post(`${SERVER}/api/auth/sign-in/email`, { data: account });
        if (signIn.ok()) await call(request, 'account.delete', account);
        await request.dispose();
      }
    },
    { auto: true },
  ],
});
