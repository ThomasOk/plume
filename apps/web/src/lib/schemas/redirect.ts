import { z } from 'zod';

// Where to go once signed in. Only a path on this site is accepted, or the sign-in page
// becomes an open redirect. Prefix checks are not enough: browsers read `//evil.example` and
// `/\evil.example` as another origin, and strip tabs and newlines, so `/<tab>/evil.example`
// is one too. Resolving against a placeholder origin asks the URL parser itself.
const PLACEHOLDER_ORIGIN = 'http://plume.invalid';

export const isSafeRedirect = (value: string): boolean => {
  if (!value.startsWith('/')) return false;
  try {
    return new URL(value, PLACEHOLDER_ORIGIN).origin === PLACEHOLDER_ORIGIN;
  } catch {
    return false;
  }
};

export const redirectSearchSchema = z.object({
  redirect: z
    .string()
    .optional()
    .catch(undefined)
    .transform((value) => (value && isSafeRedirect(value) ? value : undefined)),
});

// The key stays optional for the router, so every existing link to the auth pages remains
// valid without naming a redirect.
export interface RedirectSearch {
  redirect?: string;
}

export const parseRedirectSearch = (search: Record<string, unknown>): RedirectSearch =>
  redirectSearchSchema.parse(search);
