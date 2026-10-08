import { z } from 'zod';

// The password is asked only of an account that has one; one that signs in with Google
// proves itself by a recent sign-in instead.
export const deleteAccountSchema = z.object({
  email: z.string(),
  password: z.string().optional(),
});
