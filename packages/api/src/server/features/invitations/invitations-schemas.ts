import { z } from 'zod';

// Lowercased before validation, so `Ada@Example.com` and `ada@example.com` are one address
// and the (space, email) uniqueness of pending invitations holds regardless of case.
export const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
  role: z.enum(['admin', 'member']),
});

export const revokeInvitationSchema = z.object({
  invitationId: z.string().min(1, 'Invitation ID is required'),
});

export const invitationTokenSchema = z.object({
  token: z.string().min(1, 'Token is required').max(256),
});
