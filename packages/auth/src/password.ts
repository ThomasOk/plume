import { z } from 'zod';

// Mirrors Better Auth's default `minPasswordLength`, which the server applies on sign-up and
// on a password change since the auth configuration leaves it unset. Forms validate with it
// for immediate feedback, so sign-up and the settings page state the same rule; setting
// `minPasswordLength` in the configuration would mean changing this too.
export const MIN_PASSWORD_CHARACTERS = 8;

export const passwordSchema = z
  .string()
  .min(
    MIN_PASSWORD_CHARACTERS,
    `Minimum of ${MIN_PASSWORD_CHARACTERS} characters required`,
  );
