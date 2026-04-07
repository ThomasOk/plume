import { or, ilike } from '@repo/db';
import { user } from '@repo/db/schema';
import { and, ne } from 'drizzle-orm';
import type { DatabaseInstance } from '@repo/db/client';
import type { z } from 'zod';
import type { searchUsersSchema } from './users-schemas';

type SearchUsersInput = z.infer<typeof searchUsersSchema>;

export async function searchUsers(
  db: DatabaseInstance,
  callerId: string,
  input: SearchUsersInput,
) {
  return db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
    })
    .from(user)
    .where(
      and(
        ne(user.id, callerId),
        or(
          ilike(user.username, `%${input.query}%`),
          ilike(user.name, `%${input.query}%`),
        ),
      ),
    )
    .limit(10);
}
