import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { user } from '../schemas/auth';
import type { DatabaseInstance } from '../client';

/**
 * Slugifies a display name into a valid username.
 * "Alice Smith" → "alice_smith", "  Bob!! " → "bob"
 */
const slugifyName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // replace non-alphanumeric runs with _
    .replace(/^_+|_+$/g, '')     // trim leading/trailing underscores
    .slice(0, 28)                 // max 28 chars (leaves room for _2, _3 suffix)
    || 'user';                    // fallback if name is entirely special chars
};

/**
 * Generates a unique username from a display name.
 * Resolves conflicts by appending _2, _3, etc. (up to 10 attempts).
 * Falls back to slug_<random> if all suffixes are taken.
 */
export async function generateUniqueUsername(
  db: DatabaseInstance,
  name: string,
): Promise<string> {
  const base = slugifyName(name);

  // Try base slug first, then base_2, base_3, ...
  for (let attempt = 1; attempt <= 10; attempt++) {
    const candidate = attempt === 1 ? base : `${base}_${attempt}`;

    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, candidate))
      .limit(1);

    if (!existing) return candidate;
  }

  // Fallback: base + random suffix (virtually guaranteed unique)
  const suffix = randomBytes(4).toString('hex');
  return `${base}_${suffix}`;
}
