import { eq } from '@repo/db';
import { userPreference } from '@repo/db/schema';
import type { updatePreferencesSchema } from './preferences-schemas';
import type { DatabaseInstance } from '@repo/db/client';
import type { z } from 'zod';

type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

// A user with no row has never changed a preference, so every one is at its default. The
// defaults are written here as well as in the column defaults: the row does not exist to
// read them from.
const DEFAULT_PREFERENCES = { commentEmails: true };

export async function getPreferences(db: DatabaseInstance, userId: string) {
  const [row] = await db
    .select({ commentEmails: userPreference.commentEmails })
    .from(userPreference)
    .where(eq(userPreference.userId, userId))
    .limit(1);

  return row ?? { ...DEFAULT_PREFERENCES };
}

export async function updatePreferences(
  db: DatabaseInstance,
  userId: string,
  input: UpdatePreferencesInput,
) {
  const values = { ...input, updatedAt: new Date() };

  const [row] = await db
    .insert(userPreference)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userPreference.userId, set: values })
    .returning({ commentEmails: userPreference.commentEmails });

  return row!;
}
